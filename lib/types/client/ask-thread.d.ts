import type { AskEntry } from './AskAISection.js';
/** localStorage key for one review's Ask AI thread. */
export declare function askThreadKey(wait: {
    readonly sessionId: string;
    readonly key: string;
}): string;
export declare function subscribeAskThread(listener: () => void): () => void;
/**
 * Forget one review's Ask AI thread once the review settles (approve /
 * request-changes / dismiss): release the in-memory scope and its storage key.
 * The in-flight request is aborted; a removed scope is inert, so an answer
 * that lands afterwards cannot resurrect the thread.
 */
export declare function forgetAskThread(wait: {
    readonly sessionId: string;
    readonly key: string;
}): void;
/** Panel-facing thread handle bound to one review scope. */
export interface AskThreadHandle {
    readonly entries: readonly AskEntry[];
    readonly busy: boolean;
    /** Send one question; false when rejected (busy or empty after trim). */
    readonly send: (input: {
        readonly question: string;
        readonly quote: string | null;
    }) => boolean;
    readonly retry: (entry: AskEntry) => void;
    readonly stop: () => void;
}
export declare function useAskThread(wait: {
    readonly sessionId: string;
    readonly key: string;
}, plan: string, cancelledCopy: string): AskThreadHandle;
