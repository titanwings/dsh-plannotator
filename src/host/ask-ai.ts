/**
 * Host half of Ask AI: one `/dsh-plannotator` RPC channel whose `ask` endpoint
 * answers a plan question with a one-shot read-only subagent of the reviewed
 * session. All DSH types are structural and local — bundling a DSH runtime
 * package would break Cordis service identity.
 */

// The wire contract (budgets, channel/endpoint names, request types) is
// defined once in ../shared/limits.ts so this Host half and the browser client
// can never drift; re-exported here because this module is Ask AI's public
// surface.
import {
  ASK_AI_CHANNEL,
  ASK_AI_ENDPOINT,
  MAX_ANSWER_CHARS,
  MAX_HISTORY_ANSWER_CHARS,
  MAX_HISTORY_ENTRIES,
  MAX_HISTORY_QUESTION_CHARS,
  MAX_PLAN_CHARS,
  MAX_QUESTION_CHARS,
  MAX_QUOTE_CHARS,
  type AskAiHistoryEntry,
  type AskAiRequest,
} from '../shared/limits.js'

export {
  ASK_AI_CHANNEL,
  ASK_AI_ENDPOINT,
  MAX_ANSWER_CHARS,
  MAX_HISTORY_ANSWER_CHARS,
  MAX_HISTORY_ENTRIES,
  MAX_HISTORY_QUESTION_CHARS,
  MAX_PLAN_CHARS,
  MAX_QUESTION_CHARS,
  MAX_QUOTE_CHARS,
  type AskAiHistoryEntry,
  type AskAiRequest,
} from '../shared/limits.js'
const ANSWER_TRUNCATION_MARKER = '\n\n[... answer truncated for length ...]'

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

export interface AskAiAnswer {
  readonly answer: string
}

/** One validation problem, shaped like a zod issue (`z.custom` accepts any element). */
export interface ZodIssueLike {
  readonly code: 'custom'
  readonly path: readonly (string | number)[]
  readonly message: string
}

export interface RpcFailure {
  readonly ok: false
  readonly error:
    /** DSH's closed RPC taxonomy: bad-request REQUIRES `details.issues`; only cancelled/internal allow `{}`. */
    | { readonly code: 'bad-request'; readonly message: string; readonly details: { readonly issues: readonly ZodIssueLike[] } }
    | { readonly code: 'cancelled' | 'internal'; readonly message: string; readonly details: Record<string, never> }
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
  /**
   * Optional registry probe used to prefer the context-inheriting provider.
   * `capabilities` is read defensively: a provider that exists but does not
   * advertise the start-time capabilities Ask AI requests must not be chosen.
   */
  getProvider?(name: string):
    | { readonly capabilities?: { readonly toolFilter?: boolean; readonly persona?: boolean } }
    | undefined
}

/**
 * Provider preference: `fork` seeds the child with the parent's completed-turn
 * prefix — the earlier requirements, exploration, and discussion that explain
 * the plan. The plan itself sits in the parent's uncompleted current turn
 * (blocked on the review wait), so it always rides in the prompt verbatim.
 * A composition without `fork` — or whose `fork` does not support the
 * `toolFilter`/`persona` capabilities every start requests — degrades to
 * `spawn`; one without either fails loud at `start`.
 */
export function chooseProvider(subagents: SubagentsLike): 'fork' | 'spawn' {
  if (typeof subagents.getProvider === 'function') {
    const fork = subagents.getProvider('fork')
    if (fork?.capabilities?.toolFilter === true && fork?.capabilities?.persona === true) {
      return 'fork'
    }
  }
  return 'spawn'
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

function failure(code: 'cancelled' | 'internal', message: string): RpcFailure {
  return { ok: false, error: { code, message, details: {} } }
}

function badRequest(message: string, issues: readonly ZodIssueLike[]): RpcFailure {
  return { ok: false, error: { code: 'bad-request', message, details: { issues } } }
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

type ParseResult = { readonly ok: true; readonly value: AskAiRequest } | { readonly ok: false; readonly issues: readonly ZodIssueLike[] }

function parseHistoryEntry(value: unknown, index: number): { readonly entry: AskAiHistoryEntry } | { readonly issue: ZodIssueLike } {
  const path = ['history', index] as const
  if (value === null || typeof value !== 'object') {
    return { issue: { code: 'custom', path, message: `history[${index}] must be an object` } }
  }
  const candidate = value as Partial<AskAiHistoryEntry>
  if (typeof candidate.question !== 'string' || candidate.question.trim() === '') {
    return { issue: { code: 'custom', path: [...path, 'question'], message: 'must be a non-empty string' } }
  }
  if (candidate.question.length > MAX_HISTORY_QUESTION_CHARS) {
    return { issue: { code: 'custom', path: [...path, 'question'], message: `exceeds ${MAX_HISTORY_QUESTION_CHARS} characters` } }
  }
  if (typeof candidate.answer !== 'string' || candidate.answer === '') {
    return { issue: { code: 'custom', path: [...path, 'answer'], message: 'must be a non-empty string' } }
  }
  if (candidate.answer.length > MAX_HISTORY_ANSWER_CHARS) {
    return { issue: { code: 'custom', path: [...path, 'answer'], message: `exceeds ${MAX_HISTORY_ANSWER_CHARS} characters` } }
  }
  return { entry: { question: candidate.question, answer: candidate.answer } }
}

/**
 * Validate and bound the wire payload, collecting every violation so the
 * client can show them all; over-length plans are truncated with a marker.
 */
export function parseAskAiRequest(payload: unknown): ParseResult {
  const issues: ZodIssueLike[] = []
  const push = (path: readonly (string | number)[], message: string): void => {
    issues.push({ code: 'custom', path, message })
  }
  const requireString = (value: unknown, path: readonly (string | number)[], message: string): string | undefined => {
    if (typeof value !== 'string' || value.trim() === '') {
      push(path, message)
      return undefined
    }
    return value
  }
  if (payload === null || typeof payload !== 'object') {
    push([], 'payload must be an object')
    return { ok: false, issues }
  }
  const candidate = payload as Record<string, unknown>
  const sessionId = requireString(candidate.sessionId, ['sessionId'], 'must be a non-empty string')
  const plan = requireString(candidate.plan, ['plan'], 'must be a non-empty string')
  const question = requireString(candidate.question, ['question'], 'must be a non-empty string')
  if (question !== undefined && question.length > MAX_QUESTION_CHARS) {
    push(['question'], `exceeds ${MAX_QUESTION_CHARS} characters`)
  }
  const quote = candidate.quote === undefined
    ? undefined
    : requireString(candidate.quote, ['quote'], 'must be a non-empty string when present')
  if (quote !== undefined && quote.length > MAX_QUOTE_CHARS) {
    push(['quote'], `exceeds ${MAX_QUOTE_CHARS} characters`)
  }
  if (candidate.history !== undefined && !Array.isArray(candidate.history)) {
    push(['history'], 'must be an array when present')
  }
  const rawHistory = (candidate.history ?? []) as unknown[]
  if (rawHistory.length > MAX_HISTORY_ENTRIES) {
    push(['history'], `exceeds ${MAX_HISTORY_ENTRIES} entries`)
  }
  const history: AskAiHistoryEntry[] = []
  for (const [index, item] of rawHistory.entries()) {
    const parsed = parseHistoryEntry(item, index)
    if ('issue' in parsed) {
      issues.push(parsed.issue)
    } else {
      history.push(parsed.entry)
    }
  }
  if (issues.length > 0 || sessionId === undefined || plan === undefined || question === undefined) {
    return { ok: false, issues }
  }
  const boundedPlan = plan.length <= MAX_PLAN_CHARS
    ? plan
    : `${plan.slice(0, MAX_PLAN_CHARS)}\n\n[... plan truncated for length ...]`
  return {
    ok: true,
    value: {
      sessionId,
      plan: boundedPlan,
      question: question.trim(),
      ...(quote !== undefined ? { quote } : {}),
      history,
    },
  }
}

/**
 * Assemble the single user message of the one-shot child. With `parentContext`
 * the child is a fork seeded with the parent's completed turns; the intro then
 * explains that the plan is quoted because it was submitted in the current,
 * not-yet-complete turn.
 */
export function buildAskAiPrompt(request: AskAiRequest, options: { readonly parentContext: boolean }): string {
  const sections = [
    options.parentContext
      ? 'You wrote the implementation plan below, which the user is now reviewing in plan mode. '
        + 'Your earlier completed conversation turns are available as context; the plan itself was '
        + 'submitted in your current turn, so it is quoted verbatim here. The user has a question about it.'
      : 'The user is reviewing the implementation plan below in plan mode and has a question about it.',
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

/** Bound an answer so it always fits the history budget; marker included in the cap. */
function boundAnswer(answer: string): string {
  if (answer.length <= MAX_ANSWER_CHARS) return answer
  const head = MAX_ANSWER_CHARS - ANSWER_TRUNCATION_MARKER.length
  return `${answer.slice(0, head)}${ANSWER_TRUNCATION_MARKER}`
}

/** Endpoint dispatcher carried by the `/dsh-plannotator` channel. */
export function createAskAiHandler(ctx: HostContext) {
  return async (endpoint: string, payload: unknown, signal: AbortSignal): Promise<AskAiRpcResult> => {
    if (endpoint !== ASK_AI_ENDPOINT) {
      return badRequest(`unknown endpoint ${JSON.stringify(endpoint)} on ${ASK_AI_CHANNEL}`, [
        { code: 'custom', path: [], message: `unknown endpoint ${JSON.stringify(endpoint)} on ${ASK_AI_CHANNEL}` },
      ])
    }
    const parsed = parseAskAiRequest(payload)
    if (!parsed.ok) return badRequest(parsed.issues[0]?.message ?? 'invalid request payload', parsed.issues)
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
    const provider = chooseProvider(subagents)
    try {
      run = await subagents.start(provider, {
        label: 'plan-ask',
        prompt: [{ type: 'text', text: buildAskAiPrompt(request, { parentContext: provider === 'fork' }) }],
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
      return { ok: true, value: { answer: boundAnswer(answer) } }
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
