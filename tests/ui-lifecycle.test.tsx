import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test, { after, before, beforeEach } from 'node:test'
import { JSDOM } from 'jsdom'
import type { QuestionWait, Translate } from '../src/client/contracts.ts'
import { en, zh } from '../src/client/locales.ts'

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  runScripts: 'outside-only',
  url: 'http://127.0.0.1:3080/',
})

let viewportWidth = 1600
let rangeRect = { left: 24, bottom: 48, width: 80, height: 20, top: 28, right: 104, x: 24, y: 28 }
const mediaListeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>()
const highlightEntries = new Map<string, unknown>()
const originalGlobals = new Map<PropertyKey, PropertyDescriptor | undefined>()

function mediaMatches(query: string): boolean {
  const min = /min-width:\s*(\d+)px/.exec(query)?.[1]
  const max = /max-width:\s*(\d+)px/.exec(query)?.[1]
  return (min === undefined || viewportWidth >= Number(min))
    && (max === undefined || viewportWidth <= Number(max))
}

function installGlobal(key: PropertyKey, value: unknown): void {
  originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

function restoreGlobals(): void {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, key)
    else Object.defineProperty(globalThis, key, descriptor)
  }
}

let React: typeof import('react')
let createRoot: typeof import('react-dom/client').createRoot
let reactDom: typeof import('react-dom')
let jsxRuntime: typeof import('react/jsx-runtime')

before(async () => {
  installGlobal('window', dom.window)
  installGlobal('document', dom.window.document)
  installGlobal('navigator', dom.window.navigator)
  installGlobal('localStorage', dom.window.localStorage)
  installGlobal('HTMLElement', dom.window.HTMLElement)
  installGlobal('HTMLTextAreaElement', dom.window.HTMLTextAreaElement)
  installGlobal('Element', dom.window.Element)
  installGlobal('Node', dom.window.Node)
  installGlobal('NodeFilter', dom.window.NodeFilter)
  installGlobal('Range', dom.window.Range)
  installGlobal('Event', dom.window.Event)
  installGlobal('MouseEvent', dom.window.MouseEvent)
  installGlobal('CSS', {
    highlights: {
      set: (key: string, value: unknown) => { highlightEntries.set(key, value) },
      delete: (key: string) => highlightEntries.delete(key),
    },
  })
  installGlobal('Highlight', class {
    constructor(..._ranges: readonly AbstractRange[]) {}
  })
  installGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  installGlobal('cancelAnimationFrame', () => undefined)
  installGlobal('IS_REACT_ACT_ENVIRONMENT', true)

  Object.defineProperty(dom.window, 'innerWidth', {
    configurable: true,
    get: () => viewportWidth,
  })
  Object.defineProperty(dom.window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => {
      let listeners = mediaListeners.get(query)
      if (listeners === undefined) {
        listeners = new Set()
        mediaListeners.set(query, listeners)
      }
      return {
        media: query,
        get matches() { return mediaMatches(query) },
        onchange: null,
        addEventListener: (_type, listener) => { listeners?.add(listener as (event: MediaQueryListEvent) => void) },
        removeEventListener: (_type, listener) => { listeners?.delete(listener as (event: MediaQueryListEvent) => void) },
        addListener: listener => { listeners?.add(listener) },
        removeListener: listener => { listeners?.delete(listener) },
        dispatchEvent: () => true,
      }
    },
  })
  Object.defineProperty(dom.window.Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ ...rangeRect, toJSON: () => rangeRect }),
  })
  Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
  dom.window.requestAnimationFrame = globalThis.requestAnimationFrame
  dom.window.cancelAnimationFrame = globalThis.cancelAnimationFrame
  Object.defineProperty(dom.window, 'CSS', { configurable: true, value: globalThis.CSS })
  Object.defineProperty(dom.window, 'Highlight', { configurable: true, value: globalThis.Highlight })

  React = await import('react')
  ;({ createRoot } = await import('react-dom/client'))
  reactDom = await import('react-dom')
  jsxRuntime = await import('react/jsx-runtime')
})

after(() => {
  dom.window.close()
  restoreGlobals()
})

beforeEach(() => {
  dom.window.document.head.innerHTML = ''
  dom.window.document.body.innerHTML = '<div id="mount"></div>'
  dom.window.localStorage.clear()
  highlightEntries.clear()
  viewportWidth = 1600
  rangeRect = { left: 24, bottom: 48, width: 80, height: 20, top: 28, right: 104, x: 24, y: 28 }
})

interface ClientExports {
  readonly PlannotatorPanel: React.ComponentType<{ readonly matched: QuestionWait; readonly t: Translate }>
  readonly apply: (ctx: unknown) => void
}

async function loadClientBundle(): Promise<ClientExports> {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  let loaded: ClientExports | undefined
  const primitives = {
    Button: ({ icon, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) =>
      React.createElement('button', props, icon, children),
    MarkdownText: ({ text }: { readonly text: string }) => React.createElement(
      React.Fragment,
      null,
      ...text.split(/\n\n+/).map((block, index) => React.createElement(
        block.startsWith('#') ? 'h3' : 'p',
        { key: index },
        block.replace(/^#+\s*/, ''),
      )),
    ),
    IconChevronRightOutline14: () => React.createElement('span', null, '>'),
    IconChevronLeftOutline14: () => React.createElement('span', null, '<'),
    IconEditOutline16: () => React.createElement('span', null, 'edit'),
  }
  Object.defineProperty(dom.window, '__ModuleLoader__', {
    configurable: true,
    value: {
      load: ({ factory }: { readonly factory: (require: (id: string) => unknown) => unknown }) => {
        loaded = factory((id: string) => {
          if (id === 'react') return React
          if (id === 'react-dom') return reactDom
          if (id === 'react/jsx-runtime') return jsxRuntime
          if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
          throw new Error(`unexpected client dependency: ${id}`)
        }) as ClientExports
      },
    },
  })
  dom.window.eval(source)
  assert.ok(loaded)
  return loaded
}

function fixture(respond?: QuestionWait['respond']): { readonly wait: QuestionWait; readonly calls: unknown[] } {
  const calls: unknown[] = []
  return {
    calls,
    wait: {
      kind: 'question',
      key: 'review-1',
      sessionId: 'session-1',
      payload: {
        questions: [{
          id: 'plan-review',
          question: 'Approve this plan?',
          detail: '# Plan\n\nShip safely and keep compatibility.',
          options: [{ label: 'Approve' }, { label: 'Keep planning' }],
          intent: { kind: 'plan-review', approve: 'Approve' },
        }],
      },
      respond: respond ?? (async result => {
        calls.push(result)
        return { accepted: true }
      }),
    },
  }
}

function translator(active: { value: 'en' | 'zh' }): Translate {
  return (key, params) => {
    let value: string = (active.value === 'en' ? en : zh)[key]
    for (const [name, replacement] of Object.entries(params ?? {})) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
}

function setTextareaValue(element: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value')?.set
  assert.ok(setter)
  setter.call(element, value)
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
}

async function click(element: Element): Promise<void> {
  await React.act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
  })
}

async function renderReview(width = 1600) {
  viewportWidth = width
  const client = await loadClientBundle()
  const active = { value: 'en' as const } as { value: 'en' | 'zh' }
  const t = translator(active)
  const review = fixture()
  const container = dom.window.document.getElementById('mount')
  assert.ok(container)
  const root = createRoot(container)
  await React.act(async () => {
    root.render(React.createElement(client.PlannotatorPanel, { matched: review.wait, t }))
  })
  return { active, client, container, review, root, t }
}

async function changeViewport(width: number): Promise<void> {
  viewportWidth = width
  await React.act(async () => {
    for (const [query, listeners] of mediaListeners) {
      const event = { matches: mediaMatches(query), media: query } as MediaQueryListEvent
      for (const listener of listeners) listener(event)
    }
  })
}

test('uses one stable translator across locale changes and all responsive panel modes', async () => {
  const view = await renderReview(1480)
  assert.equal(dom.window.document.querySelector('[data-plan-review-panel]')?.getAttribute('data-panel-mode'), 'docked')
  assert.match(dom.window.document.body.textContent ?? '', /Plan ready for review/)

  view.active.value = 'zh'
  await React.act(async () => {
    view.root.render(React.createElement(view.client.PlannotatorPanel, { matched: view.review.wait, t: view.t }))
  })
  assert.match(dom.window.document.body.textContent ?? '', /计划已可审阅/)

  await changeViewport(1479)
  assert.equal(dom.window.document.querySelector('[data-plan-review-panel]'), null)
  const openDrawer = [...dom.window.document.querySelectorAll('button')]
    .find(button => button.textContent === '打开审阅栏')
  assert.ok(openDrawer)
  await click(openDrawer)
  assert.equal(dom.window.document.querySelector('[data-plan-review-panel]')?.getAttribute('data-panel-mode'), 'drawer')

  await changeViewport(640)
  assert.equal(dom.window.document.querySelector('[data-plan-review-panel]'), null)
  const openSheet = [...dom.window.document.querySelectorAll('button')]
    .find(button => button.textContent === '打开审阅栏')
  assert.ok(openSheet)
  await click(openSheet)
  assert.equal(dom.window.document.querySelector('[data-plan-review-panel]')?.getAttribute('data-panel-mode'), 'sheet')
  await React.act(async () => { view.root.unmount() })
})

test('drops a transient selection when responsive mode replaces its document surface', async () => {
  const view = await renderReview(1480)
  const paragraph = dom.window.document.querySelector('[data-plannotator-document] p')
  assert.ok(paragraph)
  await React.act(async () => {
    paragraph.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }))
  })
  assert.ok(dom.window.document.querySelector('[id$="-comment"]'))

  await changeViewport(1479)
  const openDrawer = [...dom.window.document.querySelectorAll('button')]
    .find(button => button.textContent === 'Open review')
  assert.ok(openDrawer)
  await click(openDrawer)
  assert.ok(dom.window.document.querySelector('[id$="-comment"]') === null)
  assert.ok(dom.window.document.querySelector('.dsh-plannotator-selection-action') === null)
  await React.act(async () => { view.root.unmount() })
})

test('creates an annotation, updates its floating action on scroll, and exposes an accessible jump action', async () => {
  const view = await renderReview()
  const paragraph = dom.window.document.querySelector('[data-plannotator-document] p')
  assert.ok(paragraph)
  await React.act(async () => {
    paragraph.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }))
  })
  const floating = dom.window.document.querySelector<HTMLElement>('.dsh-plannotator-selection-action')
  assert.ok(floating)
  assert.equal(floating.style.left, '24px')

  rangeRect = { left: 80, bottom: 140, width: 80, height: 20, top: 120, right: 160, x: 80, y: 120 }
  const documentSurface = dom.window.document.querySelector('[data-plannotator-document]')
  assert.ok(documentSurface)
  await React.act(async () => {
    documentSurface.dispatchEvent(new dom.window.Event('scroll', { bubbles: false }))
  })
  assert.equal(floating.style.left, '80px')
  assert.equal(floating.style.top, '140px')

  const comment = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-comment"]')
  assert.ok(comment)
  await React.act(async () => { setTextareaValue(comment, 'Keep this compatibility guarantee explicit.') })
  const add = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'Add comment')
  assert.ok(add)
  await click(add)
  assert.match(dom.window.document.body.textContent ?? '', /Keep this compatibility guarantee explicit/)
  assert.ok(highlightEntries.has('dsh-plannotator-annotations'))
  const jump = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === '#1')
  assert.ok(jump)
  assert.equal(jump.getAttribute('aria-label'), 'Go to annotation 1')
  await React.act(async () => { view.root.unmount() })
})

test('keeps draft and highlights across dock collapse and reopen', async () => {
  const view = await renderReview()
  const paragraph = dom.window.document.querySelector('[data-plannotator-document] p')
  assert.ok(paragraph)
  await React.act(async () => {
    paragraph.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }))
  })
  const comment = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-comment"]')
  assert.ok(comment)
  await React.act(async () => { setTextareaValue(comment, 'Preserve compatibility.') })
  const add = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'Add comment')
  assert.ok(add)
  await click(add)
  assert.equal(dom.window.localStorage.length, 1)
  assert.ok(highlightEntries.has('dsh-plannotator-annotations'))

  const collapse = dom.window.document.querySelector('button[aria-label="Collapse review sidebar"]')
  assert.ok(collapse)
  await click(collapse)
  assert.equal(dom.window.document.querySelector('[data-plan-review-panel]'), null)
  assert.equal(highlightEntries.has('dsh-plannotator-annotations'), false)
  const rail = dom.window.document.querySelector('.dsh-plannotator-rail-button')
  assert.ok(rail)
  await click(rail)
  assert.match(dom.window.document.body.textContent ?? '', /Preserve compatibility/)
  assert.ok(highlightEntries.has('dsh-plannotator-annotations'))
  await React.act(async () => { view.root.unmount() })
})

test('requires a second approval when unsent feedback exists', async () => {
  const view = await renderReview()
  const overall = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-overall"]')
  assert.ok(overall)
  await React.act(async () => { setTextareaValue(overall, 'Add a rollback step.') })
  const approve = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'Approve')
  assert.ok(approve)
  await click(approve)
  assert.equal(view.review.calls.length, 0)
  assert.match(dom.window.document.body.textContent ?? '', /unsent annotations will be discarded/)
  const approveAnyway = [...dom.window.document.querySelectorAll('button')]
    .find(button => button.textContent === 'Approve anyway')
  assert.ok(approveAnyway)
  await click(approveAnyway)
  assert.deepEqual(JSON.parse(JSON.stringify(view.review.calls)), [{
    ok: true,
    value: {
      sessionId: 'session-1',
      answer: { answers: [{ id: 'plan-review', selected: ['Approve'] }] },
    },
  }])
  assert.equal(dom.window.localStorage.length, 0)
  await React.act(async () => { view.root.unmount() })
})

test('settles feedback once, clears accepted drafts, and recovers from rejection', async () => {
  let accept: ((receipt: { accepted: boolean; reason?: string }) => void) | undefined
  const acceptedCalls: unknown[] = []
  const acceptedFixture = fixture(result => {
    acceptedCalls.push(result)
    return new Promise(resolve => { accept = resolve })
  })
  const client = await loadClientBundle()
  const container = dom.window.document.getElementById('mount')
  assert.ok(container)
  const root = createRoot(container)
  await React.act(async () => {
    root.render(React.createElement(client.PlannotatorPanel, {
      matched: acceptedFixture.wait,
      t: translator({ value: 'en' }),
    }))
  })
  const overall = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-overall"]')
  assert.ok(overall)
  await React.act(async () => { setTextareaValue(overall, 'Add a rollback step.') })
  assert.equal(dom.window.localStorage.length, 1)
  const send = [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === 'Send 1 comment')
  assert.ok(send)
  await click(send)
  assert.equal(acceptedCalls.length, 1)
  assert.equal(send.hasAttribute('disabled'), true)
  assert.ok(accept)
  await React.act(async () => { accept?.({ accepted: true }); await Promise.resolve() })
  assert.equal(dom.window.localStorage.length, 0)
  await React.act(async () => { root.unmount() })

  dom.window.document.body.innerHTML = '<div id="mount"></div>'
  const rejectedFixture = fixture(async () => ({ accepted: false, reason: 'stale wait' }))
  const rejectedContainer = dom.window.document.getElementById('mount')
  assert.ok(rejectedContainer)
  const rejectedRoot = createRoot(rejectedContainer)
  await React.act(async () => {
    rejectedRoot.render(React.createElement(client.PlannotatorPanel, {
      matched: rejectedFixture.wait,
      t: translator({ value: 'en' }),
    }))
  })
  const rejectedOverall = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-overall"]')
  assert.ok(rejectedOverall)
  await React.act(async () => { setTextareaValue(rejectedOverall, 'Try again.') })
  const rejectedSend = [...dom.window.document.querySelectorAll('button')]
    .find(button => button.textContent === 'Send 1 comment')
  assert.ok(rejectedSend)
  await click(rejectedSend)
  assert.match(dom.window.document.querySelector('[role="alert"]')?.textContent ?? '', /stale wait/)
  assert.equal(rejectedSend.hasAttribute('disabled'), false)
  assert.equal(dom.window.localStorage.length, 1)
  await React.act(async () => { rejectedRoot.unmount() })
})

test('keeps HMR-overlapping style owners alive until the last client fiber disposes', async () => {
  const first = await loadClientBundle()
  const second = await loadClientBundle()

  function mount(client: ClientExports) {
    const disposers: (() => void)[] = []
    const slotDisposer = () => undefined
    client.apply({
      effect: (factory: () => void | (() => void)) => {
        const dispose = factory()
        if (typeof dispose === 'function') disposers.push(dispose)
      },
      get: () => undefined,
      locale: { register: () => () => undefined },
      slots: {
        inject: (_name: string, register: () => void | (() => void)) => {
          const dispose = register()
          if (typeof dispose === 'function') disposers.push(dispose)
        },
        register: () => slotDisposer,
      },
    })
    return () => { for (const dispose of disposers.reverse()) dispose() }
  }

  const disposeFirst = mount(first)
  const disposeSecond = mount(second)
  assert.ok(dom.window.document.getElementById('dsh-plannotator-styles'))
  disposeFirst()
  assert.ok(dom.window.document.getElementById('dsh-plannotator-styles'))
  disposeSecond()
  assert.equal(dom.window.document.getElementById('dsh-plannotator-styles'), null)
})

test('refreshes CSS when a newer HMR bundle reuses a refcount-aware style node', async () => {
  const staleStyle = dom.window.document.createElement('style')
  staleStyle.id = 'dsh-plannotator-styles'
  staleStyle.setAttribute('data-dsh-plannotator-style-owners', '1')
  staleStyle.textContent = '.stale-bundle{}'
  dom.window.document.head.append(staleStyle)

  const client = await loadClientBundle()
  const disposers: (() => void)[] = []
  client.apply({
    effect: (factory: () => void | (() => void)) => {
      const dispose = factory()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
    get: () => undefined,
    locale: { register: () => () => undefined },
    slots: {
      inject: (_name: string, register: () => void | (() => void)) => {
        const dispose = register()
        if (typeof dispose === 'function') disposers.push(dispose)
      },
      register: () => () => undefined,
    },
  })

  assert.equal(staleStyle.getAttribute('data-dsh-plannotator-style-owners'), '2')
  assert.notEqual(staleStyle.textContent, '.stale-bundle{}')
  assert.match(staleStyle.textContent ?? '', /\.dsh-plannotator-panel/)
  for (const dispose of disposers.reverse()) dispose()
  assert.equal(staleStyle.getAttribute('data-dsh-plannotator-style-owners'), '1')
})

test('replaces a legacy unowned style before an older fiber can remove it', async () => {
  const legacyStyle = dom.window.document.createElement('style')
  legacyStyle.id = 'dsh-plannotator-styles'
  legacyStyle.textContent = '.legacy{}'
  dom.window.document.head.append(legacyStyle)

  const client = await loadClientBundle()
  const disposers: (() => void)[] = []
  client.apply({
    effect: (factory: () => void | (() => void)) => {
      const dispose = factory()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
    get: () => undefined,
    locale: { register: () => () => undefined },
    slots: {
      inject: (_name: string, register: () => void | (() => void)) => {
        const dispose = register()
        if (typeof dispose === 'function') disposers.push(dispose)
      },
      register: () => () => undefined,
    },
  })

  const currentStyle = dom.window.document.getElementById('dsh-plannotator-styles')
  assert.ok(currentStyle)
  assert.notEqual(currentStyle, legacyStyle)
  legacyStyle.remove()
  assert.equal(currentStyle.isConnected, true)

  for (const dispose of disposers.reverse()) dispose()
  assert.equal(dom.window.document.getElementById('dsh-plannotator-styles'), null)
})

// ---- Ask AI ----

function mockApplyCtx(connection: unknown): unknown {
  return {
    effect: (factory: () => void | (() => void)) => { factory() },
    get: (name: string) => (name === 'connection' ? connection : undefined),
    locale: { register: () => () => undefined },
    slots: {
      inject: (_name: string, register: () => void | (() => void)) => { register() },
      register: () => () => undefined,
    },
  }
}

function findButton(text: string): HTMLElement {
  const button = [...dom.window.document.querySelectorAll('button')]
    .find(candidate => candidate.textContent === text)
  assert.ok(button, `button ${text} exists`)
  return button as HTMLElement
}

async function flush(): Promise<void> {
  await React.act(async () => {
    for (let index = 0; index < 6; index += 1) await Promise.resolve()
  })
}

test('ask ai quotes the selection, sends the question, and renders the answer', async () => {
  const view = await renderReview()
  const calls: { channel: string; endpoint: string; payload: unknown }[] = []
  view.client.apply(mockApplyCtx({
    rpc: {
      call: async (channel: string, endpoint: string, payload: unknown) => {
        calls.push({ channel, endpoint, payload })
        return { ok: true, value: { answer: 'Because the API must stay stable.' } }
      },
    },
  }) as never)

  const paragraph = dom.window.document.querySelector('[data-plannotator-document] p')
  assert.ok(paragraph)
  await React.act(async () => {
    paragraph.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }))
  })
  await click(findButton('✦ Ask AI'))

  const chip = dom.window.document.querySelector('.dsh-plannotator-ask-quote-chip span')
  assert.equal(chip?.textContent, 'Ship safely and keep compatibility.')
  const input = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-ask"]')
  assert.ok(input)
  await React.act(async () => { setTextareaValue(input, 'Why keep compatibility?') })
  await click(findButton('Send'))
  await flush()

  assert.equal(calls.length, 1)
  const call = calls[0]
  assert.ok(call)
  assert.equal(call.channel, '/dsh-plannotator')
  assert.equal(call.endpoint, 'ask')
  // The bundle runs in the jsdom realm, so compare plain data, not object identity.
  assert.deepEqual(JSON.parse(JSON.stringify(call.payload)), {
    sessionId: 'session-1',
    plan: '# Plan\n\nShip safely and keep compatibility.',
    question: 'Why keep compatibility?',
    quote: 'Ship safely and keep compatibility.',
    history: [],
  })
  assert.match(
    dom.window.document.querySelector('.dsh-plannotator-ask-answer')?.textContent ?? '',
    /Because the API must stay stable/,
  )
  await React.act(async () => { view.root.unmount() })
})

test('ask ai stops an in-flight question and drops its pending entry', async () => {
  const view = await renderReview()
  view.client.apply(mockApplyCtx({
    rpc: {
      call: (_channel: string, _endpoint: string, _payload: unknown, signal?: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => { reject(new DOMException('aborted', 'AbortError')) })
        }),
    },
  }) as never)

  await click(findButton('Ask AI'))
  assert.match(dom.window.document.body.textContent ?? '', /Ask anything about this plan/)
  const input = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-ask"]')
  assert.ok(input)
  await React.act(async () => { setTextareaValue(input, 'What ships first?') })
  await click(findButton('Send'))
  assert.match(dom.window.document.body.textContent ?? '', /The plan Q&A agent is answering/)
  assert.match(dom.window.document.body.textContent ?? '', /What ships first\?/)

  await click(findButton('Stop'))
  await flush()
  assert.equal(dom.window.document.querySelector('.dsh-plannotator-ask-entry'), null)
  assert.match(dom.window.document.body.textContent ?? '', /Ask anything about this plan/)
  await React.act(async () => { view.root.unmount() })
})

test('ask ai surfaces host errors and retries the failed question', async () => {
  const view = await renderReview()
  const answers: ({ ok: false; error: { code: string; message: string } } | { ok: true; value: { answer: string } })[] = [
    { ok: false, error: { code: 'internal', message: 'the reviewed session has no live agent' } },
    { ok: true, value: { answer: 'Now it is alive.' } },
  ]
  const calls: unknown[] = []
  view.client.apply(mockApplyCtx({
    rpc: {
      call: async (_channel: string, _endpoint: string, payload: unknown) => {
        calls.push(payload)
        return answers.shift()
      },
    },
  }) as never)

  await click(findButton('Ask AI'))
  const input = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-ask"]')
  assert.ok(input)
  await React.act(async () => { setTextareaValue(input, 'Is the session live?') })
  await click(findButton('Send'))
  await flush()
  assert.match(dom.window.document.querySelector('[role="alert"]')?.textContent ?? '', /no live agent/)

  await click(findButton('Retry'))
  await flush()
  assert.equal(calls.length, 2)
  assert.match(
    dom.window.document.querySelector('.dsh-plannotator-ask-answer')?.textContent ?? '',
    /Now it is alive/,
  )
  await React.act(async () => { view.root.unmount() })
})

test('ask ai slices over-long history entries out of every follow-up payload', async () => {
  const view = await renderReview()
  const longAnswer = 'The lazy migration keeps rollback cheap. '.repeat(900)
  assert.ok(longAnswer.length > 32_000)
  const calls: unknown[] = []
  view.client.apply(mockApplyCtx({
    rpc: {
      call: async (_channel: string, _endpoint: string, payload: unknown) => {
        calls.push(payload)
        return { ok: true, value: { answer: longAnswer } }
      },
    },
  }) as never)

  await click(findButton('Ask AI'))
  const input = dom.window.document.querySelector<HTMLTextAreaElement>('[id$="-ask"]')
  assert.ok(input)
  await React.act(async () => { setTextareaValue(input, 'Why lazy?') })
  await click(findButton('Send'))
  await flush()
  assert.equal(calls.length, 1)

  await React.act(async () => { setTextareaValue(input, 'What ships first?') })
  await click(findButton('Send'))
  await flush()
  assert.equal(calls.length, 2)

  const followUp = calls[1] as { history?: readonly { question: string; answer: string }[] }
  assert.equal(followUp.history?.length, 1)
  const entry = followUp.history?.[0]
  assert.ok(entry)
  assert.equal(entry.question, 'Why lazy?')
  assert.ok(entry.answer.length <= 32_000)
  assert.match(entry.answer, /The lazy migration keeps rollback cheap/)
  await React.act(async () => { view.root.unmount() })
})
