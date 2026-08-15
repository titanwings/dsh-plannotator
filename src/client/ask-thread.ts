/**
 * Ask AI thread store: the Q&A thread lives at module scope so it survives
 * panel unmounts (navigating into the answering subagent) and page reloads.
 * In-flight requests are owned here too, so an answer that lands while the
 * panel is closed still updates the thread; the panel subscribes through
 * useSyncExternalStore.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { AskAiError, callAskAi } from './ask-ai.js'
import type { AskEntry } from './AskAISection.js'

// Payload budgets aligned with the Host ask endpoint; sliced before sending
// so an over-long value can never fail once and then keep failing on Retry.
const ASK_QUESTION_MAX_CHARS = 8_000
const ASK_QUOTE_MAX_CHARS = 8_000
const ASK_ANSWER_MAX_CHARS = 32_000

/** localStorage key for one review's Ask AI thread. */
export function askThreadKey(wait: { readonly sessionId: string; readonly key: string }): string {
  return `dsh-plannotator:ask:v1:${wait.sessionId}:${wait.key}`
}

interface ScopeState {
  readonly key: string
  entries: AskEntry[]
  controller: AbortController | null
}

const scopes = new Map<string, ScopeState>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeAskThread(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function persist(key: string, entries: readonly AskEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify({ entries }))
  } catch {
    // Thread recovery is best-effort, like annotation drafts.
  }
}

function isEntry(value: unknown): value is AskEntry {
  if (value === null || typeof value !== 'object') return false
  const entry = value as { id?: unknown; question?: unknown; status?: unknown }
  return typeof entry.id === 'string'
    && typeof entry.question === 'string'
    && (entry.status === 'pending' || entry.status === 'done' || entry.status === 'error')
}

function readStored(key: string): AskEntry[] | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return undefined
    const parsed = JSON.parse(raw) as { entries?: unknown }
    if (!Array.isArray(parsed.entries)) return undefined
    return parsed.entries.filter(isEntry)
  } catch {
    return undefined
  }
}

function entryId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ask-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function buildHistory(entries: readonly AskEntry[], excludeId?: string): { question: string; answer: string }[] {
  return entries
    .filter(entry => entry.status === 'done' && entry.id !== excludeId)
    .map(entry => ({
      question: entry.question.slice(0, ASK_QUESTION_MAX_CHARS),
      answer: entry.answer.slice(0, ASK_ANSWER_MAX_CHARS),
    }))
    .slice(-20)
}

function scopeOf(key: string, cancelledCopy: string): ScopeState {
  const existing = scopes.get(key)
  if (existing !== undefined) return existing
  const stored = readStored(key)
  // A pending entry restored from storage has no live request behind it (a
  // reload kills every fetch and the host cancels the child), so surface it
  // as cancelled instead of hanging forever.
  const entries = (stored ?? []).map(entry =>
    entry.status === 'pending'
      ? { ...entry, status: 'error' as const, error: cancelledCopy }
      : entry)
  const scope: ScopeState = { key, entries, controller: null }
  scopes.set(key, scope)
  return scope
}

function commit(scope: ScopeState, entries: AskEntry[]): void {
  scope.entries = entries
  persist(scope.key, entries)
  notify()
}

function startAsk(
  scope: ScopeState,
  wait: { readonly sessionId: string },
  plan: string,
  entry: AskEntry,
  cancelledCopy: string,
  replace: boolean,
): void {
  if (scope.controller !== null) return
  const controller = new AbortController()
  scope.controller = controller
  commit(scope, replace
    ? scope.entries.map(item => (item.id === entry.id ? entry : item))
    : [...scope.entries, entry])
  const history = buildHistory(scope.entries, entry.id)
  void callAskAi({
    sessionId: wait.sessionId,
    plan,
    question: entry.question,
    ...(entry.quote !== undefined ? { quote: entry.quote } : {}),
    history,
  }, controller.signal).then(answer => {
    commit(scope, scope.entries.map(item =>
      item.id === entry.id ? { ...item, status: 'done' as const, answer } : item))
  }).catch((cause: unknown) => {
    // controller.signal.aborted is the user's own Stop (or teardown); a host
    // `cancelled` error arrives with the signal still un-aborted and must
    // surface as a visible entry instead of silently vanishing.
    if (controller.signal.aborted) {
      commit(scope, scope.entries.filter(item => item.id !== entry.id))
      return
    }
    const message = cause instanceof AskAiError && cause.code === 'cancelled'
      ? cancelledCopy
      : cause instanceof Error ? cause.message : String(cause)
    commit(scope, scope.entries.map(item =>
      item.id === entry.id ? { ...item, status: 'error' as const, error: message } : item))
  }).finally(() => {
    if (scope.controller === controller) scope.controller = null
    notify()
  })
}

/** Panel-facing thread handle bound to one review scope. */
export interface AskThreadHandle {
  readonly entries: readonly AskEntry[]
  readonly busy: boolean
  readonly send: (input: { readonly question: string; readonly quote: string | null }) => void
  readonly retry: (entry: AskEntry) => void
  readonly stop: () => void
}

export function useAskThread(
  wait: { readonly sessionId: string; readonly key: string },
  plan: string,
  cancelledCopy: string,
): AskThreadHandle {
  const key = askThreadKey(wait)
  const scope = useMemo(() => scopeOf(key, cancelledCopy), [key, cancelledCopy])
  const entries = useSyncExternalStore(
    subscribeAskThread,
    useCallback(() => scope.entries, [scope]),
  )
  const send = useCallback((input: { readonly question: string; readonly quote: string | null }): void => {
    if (scope.controller !== null) return
    const question = input.question.trim().slice(0, ASK_QUESTION_MAX_CHARS)
    if (question === '') return
    const entry: AskEntry = {
      id: entryId(),
      ...(input.quote !== null ? { quote: input.quote.slice(0, ASK_QUOTE_MAX_CHARS) } : {}),
      question,
      answer: '',
      status: 'pending',
    }
    startAsk(scope, wait, plan, entry, cancelledCopy, false)
  }, [scope, wait, plan, cancelledCopy])
  const retry = useCallback((entry: AskEntry): void => {
    if (scope.controller !== null) return
    const pending: AskEntry = {
      id: entry.id,
      ...(entry.quote !== undefined ? { quote: entry.quote.slice(0, ASK_QUOTE_MAX_CHARS) } : {}),
      question: entry.question.slice(0, ASK_QUESTION_MAX_CHARS),
      answer: '',
      status: 'pending',
    }
    startAsk(scope, wait, plan, pending, cancelledCopy, true)
  }, [scope, wait, plan, cancelledCopy])
  const stop = useCallback((): void => { scope.controller?.abort() }, [scope])
  return { entries, busy: entries.some(entry => entry.status === 'pending'), send, retry, stop }
}
