/**
 * dsh-plannotator Host face.
 *
 * The feature deliberately owns no Host route or durable state. Its Web face
 * answers DSH's existing plan-review PendingWait, so the core plan-mode tool
 * remains the sole owner of approval, feedback, logging, and replay.
 */
export declare const name = "dsh-plannotator";
export declare function apply(): void;
