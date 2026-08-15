/**
 * Browser half of Ask AI: call the Host `/dsh-plannotator` channel through the
 * shared Connection RPC client, falling back to a hand-rolled envelope fetch
 * when no `connection` service is composed (fixture pages, tests).
 */
import type { ConnectionLike, RpcResult } from './contracts.js'
import {
  ASK_AI_CHANNEL,
  ASK_AI_ENDPOINT,
  type AskAiHistoryEntry,
  type AskAiRequest,
} from '../shared/limits.js'

// The wire contract (budgets, channel/endpoint names, request types) is
// defined once in ../shared/limits.ts and re-exported here so callers of this
// module keep the same surface.
export type { AskAiHistoryEntry, AskAiRequest } from '../shared/limits.js'

/** Ask AI failure carrying the Host RPC error code when one arrived. */
export class AskAiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
    this.name = 'AskAiError'
  }
}

function randomId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ask-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isResult(value: unknown): value is RpcResult<unknown> {
  if (value === null || typeof value !== 'object') return false
  const result = value as { ok?: unknown }
  return result.ok === true || result.ok === false
}

function unwrap(result: RpcResult<unknown>): string {
  if (!result.ok) {
    // A host cancellation is a structured outcome, not a client-side abort:
    // callers must be able to tell "user pressed Stop" from "the host
    // cancelled for its own reasons", so it is NOT translated to AbortError.
    if (result.error.code === 'cancelled') {
      throw new AskAiError(result.error.message, 'cancelled')
    }
    throw new AskAiError(result.error.message, result.error.code)
  }
  const value = result.value as { answer?: unknown } | null
  if (value === null || typeof value !== 'object' || typeof value.answer !== 'string') {
    throw new AskAiError('the host returned a malformed Ask AI answer', 'internal')
  }
  return value.answer
}

async function callViaFetch(request: AskAiRequest, signal: AbortSignal): Promise<string> {
  const rpcId = randomId()
  const response = await fetch(`${ASK_AI_CHANNEL}/${ASK_AI_ENDPOINT}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: ASK_AI_ENDPOINT, payload: request }),
    signal,
  })
  if (!response.ok) {
    throw new AskAiError(`transport failure: HTTP ${response.status}`, 'transport')
  }
  const full = await response.json() as { type?: unknown; rpcId?: unknown; result?: unknown }
  if (full.type !== 'server-response' || full.rpcId !== rpcId || !isResult(full.result)) {
    throw new AskAiError('the host returned a malformed Ask AI response', 'transport')
  }
  return unwrap(full.result)
}

async function callViaConnection(
  connection: ConnectionLike,
  request: AskAiRequest,
  signal: AbortSignal,
): Promise<string> {
  try {
    return unwrap(await connection.rpc.call(ASK_AI_CHANNEL, ASK_AI_ENDPOINT, request, signal))
  } catch (cause: unknown) {
    // The composed client deep-validates the envelope and throws its raw zod
    // error on any schema violation; never leak that dump to the user.
    if (cause instanceof Error && cause.name === 'ZodError') {
      throw new AskAiError('the plan Q&A service returned an invalid response', 'internal')
    }
    throw cause
  }
}

// Set by the plugin's apply (per browser bundle instance); tests drive the
// same seam through apply with a mock `connection` service.
let activeConnection: ConnectionLike | undefined

/** Publish the Connection service Ask AI should use; called from the plugin effect. */
export function setAskAiConnection(next: ConnectionLike | undefined): void {
  activeConnection = next
}

/** Ask one plan question; resolves with the answer text and rejects AbortError on cancel. */
export function callAskAi(request: AskAiRequest, signal: AbortSignal): Promise<string> {
  if (activeConnection !== undefined) return callViaConnection(activeConnection, request, signal)
  return callViaFetch(request, signal)
}
