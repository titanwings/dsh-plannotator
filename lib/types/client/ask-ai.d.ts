/**
 * Browser half of Ask AI: call the Host `/dsh-plannotator` channel through the
 * shared Connection RPC client, falling back to a hand-rolled envelope fetch
 * when no `connection` service is composed (fixture pages, tests).
 */
import type { ConnectionLike } from './contracts.js';
import { type AskAiRequest } from '../shared/limits.js';
export type { AskAiHistoryEntry, AskAiRequest } from '../shared/limits.js';
/** Ask AI failure carrying the Host RPC error code when one arrived. */
export declare class AskAiError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
/** Publish the Connection service Ask AI should use; called from the plugin effect. */
export declare function setAskAiConnection(next: ConnectionLike | undefined): void;
/** Ask one plan question; resolves with the answer text and rejects AbortError on cancel. */
export declare function callAskAi(request: AskAiRequest, signal: AbortSignal): Promise<string>;
