import assert from 'node:assert/strict'
import { afterEach } from 'node:test'
import test from 'node:test'
import {
  AskAiError,
  callAskAi,
  setAskAiConnection,
  type AskAiRequest,
} from '../src/client/ask-ai.ts'
import type { ConnectionLike, RpcResult } from '../src/client/contracts.ts'

const request: AskAiRequest = {
  sessionId: 'session-1',
  plan: '# Plan',
  question: 'Why lazy?',
  history: [],
}

const signal = () => new AbortController().signal

afterEach(() => {
  setAskAiConnection(undefined)
})

test('asks through the composed connection service and unwraps the answer', async () => {
  const calls: { channel: string; endpoint: string; payload: unknown }[] = []
  const connection: ConnectionLike = {
    rpc: {
      call: async (channel, endpoint, payload) => {
        calls.push({ channel, endpoint, payload })
        return { ok: true, value: { answer: 'To keep rollback cheap.' } }
      },
    },
  }
  setAskAiConnection(connection)
  const answer = await callAskAi(request, signal())
  assert.equal(answer, 'To keep rollback cheap.')
  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.channel, '/dsh-plannotator')
  assert.equal(calls[0]?.endpoint, 'ask')
  assert.deepEqual(calls[0]?.payload, request)
})

test('maps a host error branch to AskAiError and cancelled to AbortError', async () => {
  setAskAiConnection({
    rpc: { call: async () => ({ ok: false, error: { code: 'internal', message: 'session gone' } }) },
  })
  await assert.rejects(callAskAi(request, signal()), (cause: unknown) => {
    assert.ok(cause instanceof AskAiError)
    assert.equal(cause.code, 'internal')
    assert.match(cause.message, /session gone/)
    return true
  })

  setAskAiConnection({
    rpc: { call: async () => ({ ok: false, error: { code: 'cancelled', message: 'cancelled' } }) },
  })
  await assert.rejects(callAskAi(request, signal()), (cause: unknown) => {
    assert.ok(cause instanceof DOMException)
    assert.equal(cause.name, 'AbortError')
    return true
  })
})

test('rejects a malformed success value', async () => {
  setAskAiConnection({ rpc: { call: async () => ({ ok: true, value: { nope: 1 } }) } })
  await assert.rejects(callAskAi(request, signal()), (cause: unknown) => {
    assert.ok(cause instanceof AskAiError)
    assert.match(cause.message, /malformed/)
    return true
  })
})

test('falls back to the envelope fetch when no connection service is composed', async () => {
  const bodies: { rpcId?: unknown; method?: unknown; payload?: unknown }[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
    const body = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: unknown }
    bodies.push(body)
    return {
      ok: true,
      json: async () => ({
        type: 'server-response',
        rpcId: body.rpcId,
        result: { ok: true, value: { answer: 'Fetched answer.' } } satisfies RpcResult<unknown>,
      }),
    }
  }) as typeof fetch
  try {
    const answer = await callAskAi(request, signal())
    assert.equal(answer, 'Fetched answer.')
    assert.equal(bodies[0]?.method, 'ask')
    assert.deepEqual(bodies[0]?.payload, request)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetch fallback fails on transport and envelope mismatches', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = (async () => ({ ok: false, status: 500 })) as unknown as typeof fetch
    await assert.rejects(callAskAi(request, signal()), (cause: unknown) => {
      assert.ok(cause instanceof AskAiError)
      assert.equal(cause.code, 'transport')
      return true
    })

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ type: 'server-response', rpcId: 'wrong', result: { ok: true, value: { answer: 'x' } } }),
    })) as unknown as typeof fetch
    await assert.rejects(callAskAi(request, signal()), (cause: unknown) => {
      assert.ok(cause instanceof AskAiError)
      assert.match(cause.message, /malformed/)
      return true
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
