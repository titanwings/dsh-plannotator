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
import { registerAskAi, type HostContext } from './host/ask-ai.js'

export const name = 'dsh-plannotator'
// `connection` (dsh-client-connection, host half) is the transport this
// feature registers on; the web profile always composes it.
export const inject = ['connection']

export function apply(ctx: HostContext): void {
  registerAskAi(ctx)
}
