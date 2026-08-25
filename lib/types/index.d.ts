/**
 * dsh-plannotator Host face.
 *
 * The plan-review gate itself stays answer-driven (the Web face answers DSH's
 * plan-review PendingWait, and the core plan-mode tool remains the sole owner
 * of approval, feedback, logging, and replay). This Host half adds only the
 * Ask AI channel: a `/dsh-plannotator` RPC channel on the shared Connection
 * transport whose `ask` endpoint answers plan questions with a one-shot
 * read-only subagent of the reviewed session.
 */
import { type HostContext } from './host/ask-ai.js';
export declare const name = "dsh-plannotator";
export declare const inject: string[];
export declare function apply(ctx: HostContext): void;
