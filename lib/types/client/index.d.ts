import type { ClientContext } from './contracts.js';
export declare const name = "dsh-plannotator-client";
export declare const inject: string[];
/** Replace only DSH's valid plan-review composer surface. */
export declare function apply(ctx: ClientContext): void;
export { PlannotatorPanel } from './PlannotatorPanel.js';
export { planReviewOf, selectPlanReview } from './plan-review.js';
export { renderPlanFeedback } from './feedback.js';
