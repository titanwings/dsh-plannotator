/**
 * Ask AI wire contract shared by the browser client and the Host half.
 *
 * Both sides used to carry their own copies of these budgets, the channel and
 * endpoint names, and the request types — kept "in sync" by comments alone.
 * This module is the single definition: the client slices before sending and
 * the Host validates on receipt against the very same numbers, so a drift can
 * never produce a payload the other side rejects.
 */
/** Host RPC channel carrying the Ask AI `ask` endpoint. */
export declare const ASK_AI_CHANNEL = "/dsh-plannotator";
/** Endpoint name on ASK_AI_CHANNEL that answers one plan question. */
export declare const ASK_AI_ENDPOINT = "ask";
/** Cap on the plan text echoed to the answering child; over-long plans are truncated with a marker. */
export declare const MAX_PLAN_CHARS = 200000;
/** Cap on one question; the client slices before sending, the Host rejects longer values. */
export declare const MAX_QUESTION_CHARS = 8000;
/** Cap on the quoted plan excerpt attached to a question. */
export declare const MAX_QUOTE_CHARS = 8000;
/** How many prior question/answer pairs the client may attach. */
export declare const MAX_HISTORY_ENTRIES = 20;
/** Per-entry caps on history questions and answers; the client slices before sending. */
export declare const MAX_HISTORY_QUESTION_CHARS = 8000;
export declare const MAX_HISTORY_ANSWER_CHARS = 32000;
/**
 * Cap on a returned answer, equal to the history budget so the answer always
 * round-trips as a later follow-up's history entry without being rejected.
 */
export declare const MAX_ANSWER_CHARS = 32000;
/** One prior question/answer pair attached to a follow-up question. */
export interface AskAiHistoryEntry {
    readonly question: string;
    readonly answer: string;
}
/** `ask` endpoint payload, validated by the Host and sent by the client. */
export interface AskAiRequest {
    readonly sessionId: string;
    readonly plan: string;
    readonly question: string;
    readonly quote?: string;
    readonly history: readonly AskAiHistoryEntry[];
}
