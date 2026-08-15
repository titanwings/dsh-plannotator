/**
 * Host half of Ask AI: one `/dsh-plannotator` RPC channel whose `ask` endpoint
 * answers a plan question with a one-shot read-only subagent of the reviewed
 * session. All DSH types are structural and local — bundling a DSH runtime
 * package would break Cordis service identity.
 */
export declare const ASK_AI_CHANNEL = "/dsh-plannotator";
export declare const ASK_AI_ENDPOINT = "ask";
export declare const MAX_PLAN_CHARS = 200000;
export declare const MAX_QUESTION_CHARS = 8000;
export declare const MAX_QUOTE_CHARS = 8000;
export declare const MAX_HISTORY_ENTRIES = 20;
export declare const MAX_HISTORY_QUESTION_CHARS = 8000;
export declare const MAX_HISTORY_ANSWER_CHARS = 32000;
/**
 * Read-only tools offered to the answering child, in preference order. Each
 * name is probed against the parent scope before use: `tools.restrict()` fails
 * loud on unknown names, so a preset without one of these must not fail Ask AI.
 */
export declare const READ_ONLY_TOOL_CANDIDATES: readonly ["read", "grep", "glob", "web_search", "web_fetch"];
export declare const ASK_AI_PERSONA: string;
export interface AskAiHistoryEntry {
    readonly question: string;
    readonly answer: string;
}
/** Validated `ask` payload. */
export interface AskAiRequest {
    readonly sessionId: string;
    readonly plan: string;
    readonly question: string;
    readonly quote?: string;
    readonly history: readonly AskAiHistoryEntry[];
}
export interface AskAiAnswer {
    readonly answer: string;
}
/** One validation problem, shaped like a zod issue (`z.custom` accepts any element). */
export interface ZodIssueLike {
    readonly code: 'custom';
    readonly path: readonly (string | number)[];
    readonly message: string;
}
export interface RpcFailure {
    readonly ok: false;
    readonly error: 
    /** DSH's closed RPC taxonomy: bad-request REQUIRES `details.issues`; only cancelled/internal allow `{}`. */
    {
        readonly code: 'bad-request';
        readonly message: string;
        readonly details: {
            readonly issues: readonly ZodIssueLike[];
        };
    } | {
        readonly code: 'cancelled' | 'internal';
        readonly message: string;
        readonly details: Record<string, never>;
    };
}
export type AskAiRpcResult = {
    readonly ok: true;
    readonly value: AskAiAnswer;
} | RpcFailure;
interface AgentLike {
    readonly ctx: {
        get(name: string): unknown;
    };
}
interface SubagentRunLike {
    readonly result: Promise<{
        readonly stopReason: string;
        readonly output: readonly {
            readonly type: string;
            readonly text?: string;
        }[];
    }>;
    dispose(): Promise<void>;
}
interface SubagentsLike {
    start(name: string, request: {
        readonly label: string;
        readonly prompt: readonly {
            readonly type: 'text';
            readonly text: string;
        }[];
        readonly parent: AgentLike;
        readonly signal: AbortSignal;
        readonly toolFilter: {
            readonly allow: readonly string[];
        };
        readonly persona: string;
    }): Promise<SubagentRunLike>;
    /** Optional registry probe used to prefer the context-inheriting provider. */
    getProvider?(name: string): unknown;
}
/**
 * Provider preference: `fork` seeds the child with the parent's completed-turn
 * prefix — the earlier requirements, exploration, and discussion that explain
 * the plan. The plan itself sits in the parent's uncompleted current turn
 * (blocked on the review wait), so it always rides in the prompt verbatim.
 * A composition without `fork` degrades to `spawn`; one without either fails
 * loud at `start`.
 */
export declare function chooseProvider(subagents: SubagentsLike): 'fork' | 'spawn';
interface ConnectionLike {
    readonly rpc: {
        handle(channel: string, handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<AskAiRpcResult>, options: {
            readonly authority: 'loopback' | 'trusted-host';
        }): () => Promise<void>;
    };
}
/** Minimal host-plugin context surface: `connection` is a declared injection. */
export interface HostContext {
    effect(factory: () => (() => Promise<void>) | (() => void) | void, label?: string): void;
    get(name: string): unknown;
    readonly connection: ConnectionLike;
}
type ParseResult = {
    readonly ok: true;
    readonly value: AskAiRequest;
} | {
    readonly ok: false;
    readonly issues: readonly ZodIssueLike[];
};
/**
 * Validate and bound the wire payload, collecting every violation so the
 * client can show them all; over-length plans are truncated with a marker.
 */
export declare function parseAskAiRequest(payload: unknown): ParseResult;
/**
 * Assemble the single user message of the one-shot child. With `parentContext`
 * the child is a fork seeded with the parent's completed turns; the intro then
 * explains that the plan is quoted because it was submitted in the current,
 * not-yet-complete turn.
 */
export declare function buildAskAiPrompt(request: AskAiRequest, options: {
    readonly parentContext: boolean;
}): string;
/**
 * Keep the read-only candidates that actually exist in the parent scope.
 * `restrict` is validated synchronously and lifted at once; an unknown name
 * throws and is dropped, and an empty result legitimately means "no tools".
 */
export declare function probeReadOnlyTools(parent: AgentLike): string[];
/** Endpoint dispatcher carried by the `/dsh-plannotator` channel. */
export declare function createAskAiHandler(ctx: HostContext): (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<AskAiRpcResult>;
/** Register the channel on the shared web transport; disposed with the plugin fiber. */
export declare function registerAskAi(ctx: HostContext): void;
export {};
