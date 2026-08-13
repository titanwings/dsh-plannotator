import type { ComposerChainProps, QuestionOption, QuestionWait } from './contracts.js';
export interface PlanReview {
    readonly wait: QuestionWait;
    readonly id: string;
    readonly question: string;
    readonly plan: string;
    readonly approve: QuestionOption;
    readonly decline?: QuestionOption;
}
/**
 * Narrow one DSH question wait to the exact binary plan-review protocol.
 * Unknown/malformed requests are left to the built-in question renderer.
 */
export declare function planReviewOf(wait: QuestionWait): PlanReview | undefined;
/** Claim only a valid plan review and preserve the PendingWait's identity. */
export declare function selectPlanReview({ interactions }: ComposerChainProps): QuestionWait | null;
/** Approve with the asker's exact option label. */
export declare function approvePlan(review: PlanReview): Promise<void>;
/**
 * Return custom feedback. DSH single-select answers require custom text and
 * selected options to be mutually exclusive, hence selected: [].
 */
export declare function requestPlanChanges(review: PlanReview, feedback: string): Promise<void>;
/** Dismiss the wait so the ordinary DSH composer returns for discussion. */
export declare function dismissPlanReview(review: PlanReview): Promise<void>;
