export interface PlanAnnotation {
    readonly id: string;
    readonly start: number;
    readonly end: number;
    readonly quote: string;
    readonly prefix: string;
    readonly suffix: string;
    readonly comment: string;
    readonly createdAt: number;
}
export interface ReviewDraft {
    readonly revision: string;
    readonly annotations: readonly PlanAnnotation[];
    readonly general: string;
}
/** Small deterministic content stamp; used only to reject a stale browser draft. */
export declare function planRevision(plan: string): string;
/** Stable agent-facing Markdown, ordered by document position. */
export declare function renderPlanFeedback(annotations: readonly PlanAnnotation[], general: string, revision: string): string;
/** Fail closed on malformed or stale localStorage data. */
export declare function parseStoredDraft(value: string | null, revision: string): ReviewDraft | undefined;
