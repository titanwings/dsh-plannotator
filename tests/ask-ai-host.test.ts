import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ASK_AI_CHANNEL,
  MAX_PLAN_CHARS,
  buildAskAiPrompt,
  createAskAiHandler,
  parseAskAiRequest,
  probeReadOnlyTools,
  registerAskAi,
  type AskAiRequest,
  type HostContext,
} from '../src/host/ask-ai.ts'

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sessionId: 'session-1',
    plan: '# Plan\n\nShip safely.',
    question: 'Why is the migration lazy?',
    ...overrides,
  }
}

test('parseAskAiRequest accepts a minimal payload and defaults history', () => {
  const parsed = parseAskAiRequest(validPayload())
  assert.ok(parsed.ok)
  assert.equal(parsed.value.sessionId, 'session-1')
  assert.equal(parsed.value.history.length, 0)
  assert.equal('quote' in parsed.value, false)
})

test('parseAskAiRequest rejects malformed payloads and collects every violation', () => {
  assert.deepEqual(parseAskAiRequest(null).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({ sessionId: '' })).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({ plan: '  ' })).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({ question: ' ' })).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({ question: 'x'.repeat(8_001) })).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({ quote: '' })).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({ history: [{}] })).ok, false)
  assert.deepEqual(parseAskAiRequest(validPayload({
    history: Array.from({ length: 21 }, () => ({ question: 'q', answer: 'a' })),
  })).ok, false)

  const tooLong = parseAskAiRequest(validPayload({ question: 'x'.repeat(8_001) }))
  assert.deepEqual(tooLong.ok, false)
  if (!tooLong.ok) {
    assert.deepEqual(tooLong.issues, [{
      code: 'custom',
      path: ['question'],
      message: 'exceeds 8000 characters',
    }])
  }

  const multiple = parseAskAiRequest(validPayload({ sessionId: '', question: ' ' }))
  assert.deepEqual(multiple.ok, false)
  if (!multiple.ok) {
    assert.deepEqual(multiple.issues.map(issue => issue.path), [['sessionId'], ['question']])
  }

  const badHistory = parseAskAiRequest(validPayload({ history: [{ question: 'q', answer: '' }] }))
  assert.deepEqual(badHistory.ok, false)
  if (!badHistory.ok) {
    assert.deepEqual(badHistory.issues[0]?.path, ['history', 0, 'answer'])
  }
})

test('parseAskAiRequest truncates an over-length plan with a visible marker', () => {
  const parsed = parseAskAiRequest(validPayload({ plan: `# ${'x'.repeat(MAX_PLAN_CHARS)}` }))
  assert.ok(parsed.ok)
  assert.ok(parsed.value.plan.length < MAX_PLAN_CHARS + 64)
  assert.match(parsed.value.plan, /\[\.\.\. plan truncated for length \.\.\.\]/)
})

test('buildAskAiPrompt assembles plan, history, quote, and question', () => {
  const request: AskAiRequest = {
    sessionId: 's',
    plan: 'PLAN_TEXT',
    question: 'QUESTION_TEXT',
    quote: 'QUOTE_TEXT',
    history: [{ question: 'EARLIER_Q', answer: 'EARLIER_A' }],
  }
  const prompt = buildAskAiPrompt(request, { parentContext: false })
  assert.ok(prompt.indexOf('<plan>\nPLAN_TEXT\n</plan>') >= 0)
  assert.ok(prompt.indexOf('Q1: EARLIER_Q') >= 0)
  assert.ok(prompt.indexOf('A1: EARLIER_A') >= 0)
  assert.ok(prompt.indexOf('<quote>\nQUOTE_TEXT\n</quote>') >= 0)
  assert.ok(prompt.endsWith('Question: QUESTION_TEXT'))

  const forked = buildAskAiPrompt(request, { parentContext: true })
  assert.match(forked, /You wrote the implementation plan/)
  assert.match(forked, /earlier completed conversation turns/)
})

interface FakeParent {
  readonly parent: { readonly ctx: { get(name: string): unknown } }
  readonly restricted: readonly (readonly string[])[]
}

function fakeParent(unknownTools: readonly string[] = []): FakeParent {
  const restricted: string[][] = []
  const parent = {
    ctx: {
      get: (name: string): unknown => name === 'tools'
        ? {
          restrict: (filter: { readonly allow: readonly string[] }) => {
            restricted.push([...filter.allow])
            if (filter.allow.some(tool => unknownTools.includes(tool))) {
              throw new Error(`tools.restrict() names unknown global tool "${filter.allow[0]}"`)
            }
            return () => undefined
          },
        }
        : undefined,
    },
  }
  return { parent, restricted }
}

test('probeReadOnlyTools keeps only tools the parent scope actually has', () => {
  const { parent, restricted } = fakeParent(['web_fetch'])
  const allow = probeReadOnlyTools(parent)
  assert.deepEqual(allow, ['read', 'grep', 'glob', 'web_search'])
  assert.equal(restricted.length, 5)
})

test('probeReadOnlyTools yields an empty allow list without a tools service', () => {
  assert.deepEqual(probeReadOnlyTools({ ctx: { get: () => undefined } }), [])
})

interface StartCapture {
  readonly name: string
  readonly request: {
    readonly label: string
    readonly prompt: readonly { readonly type: string; readonly text: string }[]
    readonly toolFilter: { readonly allow: readonly string[] }
    readonly persona: string
  }
}

function handlerFixture(options: {
  readonly stopReason?: string
  readonly output?: readonly { readonly type: string; readonly text?: string }[]
  readonly startError?: Error
  readonly agents?: unknown
  readonly subagents?: unknown
  readonly unknownTools?: readonly string[]
  readonly withFork?: boolean
  readonly withForkCapabilities?: { readonly toolFilter?: boolean; readonly persona?: boolean }
}) {
  const { parent } = fakeParent(options.unknownTools ?? [])
  const starts: StartCapture[] = []
  let disposed = 0
  const run = {
    result: Promise.resolve({
      stopReason: options.stopReason ?? 'completed',
      output: options.output ?? [{ type: 'text', text: 'The migration is lazy to keep rollback cheap.' }],
    }),
    dispose: async () => { disposed += 1 },
  }
  const subagents = 'subagents' in options
    ? options.subagents
    : {
      start: async (name: string, request: StartCapture['request']): Promise<typeof run> => {
        starts.push({ name, request })
        if (options.startError !== undefined) throw options.startError
        return run
      },
      getProvider: (name: string): unknown => {
        if (name === 'spawn') return { capabilities: { toolFilter: true, persona: true } }
        if (name === 'fork' && options.withFork !== false) {
          return options.withForkCapabilities === undefined
            ? { capabilities: { toolFilter: true, persona: true } }
            : { capabilities: options.withForkCapabilities }
        }
        return undefined
      },
    }
  const agents = 'agents' in options
    ? options.agents
    : { get: (sessionId: string) => (sessionId === 'session-1' ? parent : undefined) }
  const ctx = {
    get: (name: string): unknown =>
      name === 'agents' ? agents : name === 'subagents' ? subagents : undefined,
  }
  const handler = createAskAiHandler(ctx as unknown as HostContext)
  return { disposed: () => disposed, handler, starts }
}

const signal = () => new AbortController().signal

/**
 * Mirror of DSH's closed RPC error schema (`rpcErrorSchema` bad-request branch):
 * bad-request REQUIRES `details.issues` to be an array; cancelled/internal only
 * allow `details: {}`. The composed web client runs this before surfacing any
 * response, so an invalid body would surface as a raw zod error.
 */
function assertSchemaValid(result: { readonly ok: false; readonly error: unknown }): void {
  const error = result.error as { code?: unknown; message?: unknown; details?: unknown }
  assert.equal(error.code, 'bad-request')
  assert.equal(typeof error.message, 'string')
  assert.ok(error.details !== null && typeof error.details === 'object')
  const details = error.details as { issues?: unknown }
  assert.ok(Array.isArray(details.issues), 'bad-request must carry details.issues as an array')
  for (const issue of details.issues as readonly { code?: unknown; path?: unknown; message?: unknown }[]) {
    assert.equal(issue.code, 'custom')
    assert.ok(Array.isArray(issue.path))
    assert.equal(typeof issue.message, 'string')
  }
}

test('handler rejects unknown endpoints and malformed payloads as schema-valid bad-request', async () => {
  const { handler } = handlerFixture({})
  const endpoint = await handler('nope', validPayload(), signal())
  assert.equal(endpoint.ok, false)
  if (!endpoint.ok) assertSchemaValid(endpoint)

  const blank = await handler('ask', validPayload({ question: '  ' }), signal())
  assert.equal(blank.ok, false)
  if (!blank.ok) {
    assertSchemaValid(blank)
    assert.deepEqual(blank.error.details.issues[0]?.path, ['question'])
  }

  const tooLong = await handler('ask', validPayload({ question: 'x'.repeat(8_001) }), signal())
  assert.equal(tooLong.ok, false)
  if (!tooLong.ok) {
    assertSchemaValid(tooLong)
    assert.match(tooLong.error.message, /exceeds 8000 characters/)
  }

  const notObject = await handler('ask', { nope: true }, signal())
  assert.equal(notObject.ok, false)
  if (!notObject.ok) assertSchemaValid(notObject)
})

test('handler fails loud when the subagent capability or the live agent is absent', async () => {
  const missing = handlerFixture({ agents: undefined })
  const unavailable = await missing.handler('ask', validPayload(), signal())
  assert.equal(unavailable.ok, false)
  if (!unavailable.ok) assert.match(unavailable.error.message, /subagent capability/)

  const noAgent = handlerFixture({})
  const result = await noAgent.handler('ask', validPayload({ sessionId: 'gone' }), signal())
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error.message, /no live agent/)
})

test('handler starts a read-only one-shot child and returns its answer', async () => {
  const { disposed, handler, starts } = handlerFixture({ unknownTools: ['web_fetch'] })
  const result = await handler('ask', validPayload({
    quote: 'Ship safely.',
    history: [{ question: 'Earlier?', answer: 'Earlier answer.' }],
  }), signal())
  assert.deepEqual(result, {
    ok: true,
    value: { answer: 'The migration is lazy to keep rollback cheap.' },
  })
  assert.equal(starts.length, 1)
  const start = starts[0]
  assert.ok(start)
  assert.equal(start.name, 'fork')
  assert.equal(start.request.label, 'plan-ask')
  assert.deepEqual(start.request.toolFilter.allow, ['read', 'grep', 'glob', 'web_search'])
  assert.match(start.request.persona, /read-only/)
  assert.match(start.request.prompt[0]?.text ?? '', /You wrote the implementation plan/)
  assert.match(start.request.prompt[0]?.text ?? '', /Ship safely\./)
  assert.match(start.request.prompt[0]?.text ?? '', /Earlier answer\./)
  assert.match(start.request.prompt[0]?.text ?? '', /Why is the migration lazy\?/)
  assert.equal(disposed(), 1)
})

test('handler falls back to a fresh spawn child when no fork provider is registered', async () => {
  const { handler, starts } = handlerFixture({ withFork: false })
  const result = await handler('ask', validPayload(), signal())
  assert.equal(result.ok, true)
  assert.equal(starts[0]?.name, 'spawn')
  assert.match(starts[0]?.request.prompt[0]?.text ?? '', /The user is reviewing the implementation plan/)
})

test('handler falls back to spawn when a fork provider lacks the requested capabilities', async () => {
  for (const capabilities of [
    {},
    { toolFilter: true },
    { persona: true },
    { toolFilter: false, persona: false },
  ]) {
    const { handler, starts } = handlerFixture({ withForkCapabilities: capabilities })
    const result = await handler('ask', validPayload(), signal())
    assert.equal(result.ok, true, `fork with capabilities ${JSON.stringify(capabilities)} must degrade`)
    assert.equal(starts[0]?.name, 'spawn')
    assert.match(starts[0]?.request.prompt[0]?.text ?? '', /The user is reviewing the implementation plan/)
  }
})

test('handler maps a startup failure to an internal error without a run to dispose', async () => {
  const { handler } = handlerFixture({ startError: new Error('no subagent provider registered for "spawn"') })
  const result = await handler('ask', validPayload(), signal())
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.code, 'internal')
    assert.match(result.error.message, /no subagent provider/)
  }
})

test('handler maps non-completed stop reasons and empty output', async () => {
  const aborted = handlerFixture({ stopReason: 'aborted' })
  assert.deepEqual(await aborted.handler('ask', validPayload(), signal()), {
    ok: false,
    error: { code: 'cancelled', message: 'the question was cancelled', details: {} },
  })
  assert.equal(aborted.disposed(), 1)

  const failed = handlerFixture({ stopReason: 'error' })
  const failure = await failed.handler('ask', validPayload(), signal())
  assert.equal(failure.ok, false)
  if (!failure.ok) assert.match(failure.error.message, /error/)

  const empty = handlerFixture({ output: [] })
  const noAnswer = await empty.handler('ask', validPayload(), signal())
  assert.equal(noAnswer.ok, false)
  if (!noAnswer.ok) assert.match(noAnswer.error.message, /no answer/)
})

test('handler bounds over-long answers so they still round-trip as history', async () => {
  const longText = 'The lazy migration keeps rollback cheap. '.repeat(900)
  assert.ok(longText.length > 32_000)
  const { handler } = handlerFixture({
    output: [{ type: 'text', text: longText }],
  })
  const result = await handler('ask', validPayload(), signal())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.ok(result.value.answer.length <= 32_000)
    assert.match(result.value.answer, /\[\.\.\. answer truncated for length \.\.\.\]$/)
    assert.match(result.value.answer, /The lazy migration keeps rollback cheap/)
  }

  // The truncated answer must pass the host's own history validation: this is
  // the regression for an over-long answer poisoning every follow-up question.
  const followUp = parseAskAiRequest(validPayload({
    question: 'What ships first?',
    history: result.ok ? [{ question: 'Why lazy?', answer: result.value.answer }] : [],
  }))
  assert.deepEqual(followUp.ok, true)
})

test('handler leaves answers within the cap untouched', async () => {
  const { handler } = handlerFixture({
    output: [{ type: 'text', text: 'Short and complete.' }],
  })
  const result = await handler('ask', validPayload(), signal())
  assert.deepEqual(result, { ok: true, value: { answer: 'Short and complete.' } })
})

test('handler answers cancelled when the request signal wins mid-run', async () => {
  const controller = new AbortController()
  const { parent } = fakeParent()
  const run = {
    result: new Promise<{ stopReason: string; output: never[] }>(resolve => {
      controller.signal.addEventListener('abort', () => { resolve({ stopReason: 'aborted', output: [] }) })
    }),
    dispose: async () => undefined,
  }
  const ctx = {
    get: (name: string): unknown => {
      if (name === 'agents') return { get: () => parent }
      if (name === 'subagents') return { start: async () => run }
      return undefined
    },
  }
  const handler = createAskAiHandler(ctx as unknown as HostContext)
  const pending = handler('ask', validPayload(), controller.signal)
  controller.abort()
  const result = await pending
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'cancelled')
})

test('registerAskAi mounts the channel on the connection transport with trusted-host authority', () => {
  let captured: { channel?: string; authority?: string } = {}
  const disposer = async () => undefined
  const ctx = {
    effect(factory: () => unknown): void { factory() },
    get: () => undefined,
    connection: {
      rpc: {
        handle: (channel: string, _handler: unknown, options: { authority: string }) => {
          captured = { channel, authority: options.authority }
          return disposer
        },
      },
    },
  }
  registerAskAi(ctx as unknown as HostContext)
  assert.equal(captured.channel, ASK_AI_CHANNEL)
  assert.equal(captured.authority, 'trusted-host')
})
