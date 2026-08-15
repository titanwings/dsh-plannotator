/**
 * Host half of Ask AI: one `/dsh-plannotator` RPC channel whose `ask` endpoint
 * answers a plan question with a one-shot read-only subagent of the reviewed
 * session. All DSH types are structural and local — bundling a DSH runtime
 * package would break Cordis service identity.
 */

export const ASK_AI_CHANNEL = '/dsh-plannotator'
export const ASK_AI_ENDPOINT = 'ask'

export const MAX_PLAN_CHARS = 200_000
export const MAX_QUESTION_CHARS = 8_000
export const MAX_QUOTE_CHARS = 8_000
export const MAX_HISTORY_ENTRIES = 20
export const MAX_HISTORY_QUESTION_CHARS = 8_000
export const MAX_HISTORY_ANSWER_CHARS = 32_000

/**
 * Read-only tools offered to the answering child, in preference order. Each
 * name is probed against the parent scope before use: `tools.restrict()` fails
 * loud on unknown names, so a preset without one of these must not fail Ask AI.
 */
export const READ_ONLY_TOOL_CANDIDATES = ['read', 'grep', 'glob', 'web_search', 'web_fetch'] as const

export const ASK_AI_PERSONA = [
  'You are a read-only assistant answering the user\'s questions about an implementation plan that is under review.',
  'Answer directly and concretely, citing the plan when relevant.',
  'You may use your read-only tools to inspect the repository when the answer depends on the code.',
  'Never modify files, never rewrite or update the plan itself, and never start new work;',
  'if an answer implies a change, describe what you would change instead.',
].join(' ')

export interface AskAiHistoryEntry {
  readonly question: string
  readonly answer: string
}

/** Validated `ask` payload. */
export interface AskAiRequest {
  readonly sessionId: string
  readonly plan: string
  readonly question: string
  readonly quote?: string
  readonly history: readonly AskAiHistoryEntry[]
}

export interface AskAiAnswer {
  readonly answer: string
}

export interface RpcFailure {
  readonly ok: false
  readonly error: {
    /** Closed DSH RPC taxonomy; the client envelope parser rejects anything else. */
    readonly code: 'bad-request' | 'cancelled' | 'internal'
    readonly message: string
    readonly details: Record<string, unknown>
  }
}

export type AskAiRpcResult = { readonly ok: true; readonly value: AskAiAnswer } | RpcFailure

interface ToolsLike {
  restrict(filter: { readonly allow: readonly string[] }): () => void
}

interface AgentLike {
  readonly ctx: { get(name: string): unknown }
}

interface AgentsLike {
  get(sessionId: string): AgentLike | undefined
}

interface SubagentRunLike {
  readonly result: Promise<{
    readonly stopReason: string
    readonly output: readonly { readonly type: string; readonly text?: string }[]
  }>
  dispose(): Promise<void>
}

interface SubagentsLike {
  start(name: string, request: {
    readonly label: string
    readonly prompt: readonly { readonly type: 'text'; readonly text: string }[]
    readonly parent: AgentLike
    readonly signal: AbortSignal
    readonly toolFilter: { readonly allow: readonly string[] }
    readonly persona: string
  }): Promise<SubagentRunLike>
}

interface ConnectionLike {
  readonly rpc: {
    handle(
      channel: string,
      handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<AskAiRpcResult>,
      options: { readonly authority: 'loopback' | 'trusted-host' },
    ): () => Promise<void>
  }
}

/** Minimal host-plugin context surface: `connection` is a declared injection. */
export interface HostContext {
  effect(factory: () => (() => Promise<void>) | (() => void) | void, label?: string): void
  get(name: string): unknown
  readonly connection: ConnectionLike
}

function failure(code: RpcFailure['error']['code'], message: string): RpcFailure {
  return { ok: false, error: { code, message, details: {} } }
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

type ParseResult = { readonly ok: true; readonly value: AskAiRequest } | { readonly ok: false; readonly message: string }

function parseHistoryEntry(value: unknown, index: number): { readonly entry: AskAiHistoryEntry } | { readonly message: string } {
  if (value === null || typeof value !== 'object') return { message: `history[${index}] must be an object` }
  const candidate = value as Partial<AskAiHistoryEntry>
  if (typeof candidate.question !== 'string' || candidate.question.trim() === '') {
    return { message: `history[${index}].question must be a non-empty string` }
  }
  if (candidate.question.length > MAX_HISTORY_QUESTION_CHARS) {
    return { message: `history[${index}].question exceeds ${MAX_HISTORY_QUESTION_CHARS} characters` }
  }
  if (typeof candidate.answer !== 'string' || candidate.answer === '') {
    return { message: `history[${index}].answer must be a non-empty string` }
  }
  if (candidate.answer.length > MAX_HISTORY_ANSWER_CHARS) {
    return { message: `history[${index}].answer exceeds ${MAX_HISTORY_ANSWER_CHARS} characters` }
  }
  return { entry: { question: candidate.question, answer: candidate.answer } }
}

/** Validate and bound the wire payload; over-length plans are truncated with a visible marker. */
export function parseAskAiRequest(payload: unknown): ParseResult {
  if (payload === null || typeof payload !== 'object') return { ok: false, message: 'payload must be an object' }
  const candidate = payload as Record<string, unknown>
  if (typeof candidate.sessionId !== 'string' || candidate.sessionId === '') {
    return { ok: false, message: 'sessionId must be a non-empty string' }
  }
  if (typeof candidate.plan !== 'string' || candidate.plan.trim() === '') {
    return { ok: false, message: 'plan must be a non-empty string' }
  }
  if (typeof candidate.question !== 'string' || candidate.question.trim() === '') {
    return { ok: false, message: 'question must be a non-empty string' }
  }
  if (candidate.question.length > MAX_QUESTION_CHARS) {
    return { ok: false, message: `question exceeds ${MAX_QUESTION_CHARS} characters` }
  }
  if (candidate.quote !== undefined && (typeof candidate.quote !== 'string' || candidate.quote.trim() === '')) {
    return { ok: false, message: 'quote must be a non-empty string when present' }
  }
  if (typeof candidate.quote === 'string' && candidate.quote.length > MAX_QUOTE_CHARS) {
    return { ok: false, message: `quote exceeds ${MAX_QUOTE_CHARS} characters` }
  }
  if (candidate.history !== undefined && !Array.isArray(candidate.history)) {
    return { ok: false, message: 'history must be an array when present' }
  }
  const rawHistory = (candidate.history ?? []) as unknown[]
  if (rawHistory.length > MAX_HISTORY_ENTRIES) {
    return { ok: false, message: `history exceeds ${MAX_HISTORY_ENTRIES} entries` }
  }
  const history: AskAiHistoryEntry[] = []
  for (const [index, item] of rawHistory.entries()) {
    const parsed = parseHistoryEntry(item, index)
    if ('message' in parsed) return { ok: false, message: parsed.message }
    history.push(parsed.entry)
  }
  const plan = candidate.plan.length <= MAX_PLAN_CHARS
    ? candidate.plan
    : `${candidate.plan.slice(0, MAX_PLAN_CHARS)}\n\n[... plan truncated for length ...]`
  return {
    ok: true,
    value: {
      sessionId: candidate.sessionId,
      plan,
      question: candidate.question.trim(),
      ...(typeof candidate.quote === 'string' ? { quote: candidate.quote } : {}),
      history,
    },
  }
}

/** Assemble the single user message of the one-shot child (a spawned child sees no parent context). */
export function buildAskAiPrompt(request: AskAiRequest): string {
  const sections = [
    'The user is reviewing the implementation plan below in plan mode and has a question about it.',
    '',
    '<plan>',
    request.plan,
    '</plan>',
  ]
  if (request.history.length > 0) {
    sections.push('', 'Previous questions and answers about this plan:')
    request.history.forEach((entry, index) => {
      sections.push('', `Q${index + 1}: ${entry.question}`, `A${index + 1}: ${entry.answer}`)
    })
  }
  if (request.quote !== undefined) {
    sections.push('', 'Excerpt the user selected in the plan:', '<quote>', request.quote, '</quote>')
  }
  sections.push('', `Question: ${request.question}`)
  return sections.join('\n')
}

/**
 * Keep the read-only candidates that actually exist in the parent scope.
 * `restrict` is validated synchronously and lifted at once; an unknown name
 * throws and is dropped, and an empty result legitimately means "no tools".
 */
export function probeReadOnlyTools(parent: AgentLike): string[] {
  const tools = parent.ctx.get('tools') as ToolsLike | undefined
  if (tools === undefined || typeof tools.restrict !== 'function') return []
  const allow: string[] = []
  for (const name of READ_ONLY_TOOL_CANDIDATES) {
    try {
      tools.restrict({ allow: [name] })()
      allow.push(name)
    } catch {
      // The parent's composition has no tool with this name; the child cannot use it either.
    }
  }
  return allow
}

function answerText(output: readonly { readonly type: string; readonly text?: string }[]): string {
  return output
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('')
}

/** Endpoint dispatcher carried by the `/dsh-plannotator` channel. */
export function createAskAiHandler(ctx: HostContext) {
  return async (endpoint: string, payload: unknown, signal: AbortSignal): Promise<AskAiRpcResult> => {
    if (endpoint !== ASK_AI_ENDPOINT) {
      return failure('bad-request', `unknown endpoint ${JSON.stringify(endpoint)} on ${ASK_AI_CHANNEL}`)
    }
    const parsed = parseAskAiRequest(payload)
    if (!parsed.ok) return failure('bad-request', parsed.message)
    const request = parsed.value

    const agents = ctx.get('agents') as AgentsLike | undefined
    const subagents = ctx.get('subagents') as SubagentsLike | undefined
    if (agents === undefined || subagents === undefined) {
      return failure('internal', 'this deployment composes no subagent capability; Ask AI is unavailable')
    }
    const parent = agents.get(request.sessionId)
    if (parent === undefined) {
      return failure('internal', 'the reviewed session has no live agent; Ask AI requires an active session')
    }

    let run: SubagentRunLike
    try {
      run = await subagents.start('spawn', {
        label: 'plan-ask',
        prompt: [{ type: 'text', text: buildAskAiPrompt(request) }],
        parent,
        signal,
        toolFilter: { allow: probeReadOnlyTools(parent) },
        persona: ASK_AI_PERSONA,
      })
    } catch (cause: unknown) {
      if (signal.aborted) return failure('cancelled', 'the question was cancelled')
      return failure('internal', `failed to start the plan Q&A agent: ${messageOf(cause)}`)
    }

    try {
      const result = await run.result
      if (signal.aborted || result.stopReason === 'aborted') {
        return failure('cancelled', 'the question was cancelled')
      }
      if (result.stopReason !== 'completed') {
        return failure('internal', `the plan Q&A agent stopped without answering (${result.stopReason})`)
      }
      const answer = answerText(result.output)
      if (answer.trim() === '') return failure('internal', 'the plan Q&A agent returned no answer')
      return { ok: true, value: { answer } }
    } catch (cause: unknown) {
      if (signal.aborted) return failure('cancelled', 'the question was cancelled')
      return failure('internal', messageOf(cause))
    } finally {
      try {
        await run.dispose()
      } catch {
        // Disposal failure must not mask the settled answer or its error.
      }
    }
  }
}

/** Register the channel on the shared web transport; disposed with the plugin fiber. */
export function registerAskAi(ctx: HostContext): void {
  ctx.effect(
    () => ctx.connection.rpc.handle(ASK_AI_CHANNEL, createAskAiHandler(ctx), { authority: 'trusted-host' }),
    'dsh-plannotator: ask-ai rpc channel',
  )
}
