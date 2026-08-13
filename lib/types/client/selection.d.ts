import type { PlanAnnotation } from './feedback.js';
export interface SelectionAnchor extends Omit<PlanAnnotation, 'id' | 'comment' | 'createdAt'> {
    readonly rect: {
        readonly left: number;
        readonly bottom: number;
    };
}
/** Convert the current browser selection to a text-context anchor within root. */
export declare function selectionAnchor(root: HTMLElement): SelectionAnchor | undefined;
/** Use one rendered Markdown block as a coarse, mouse-friendly anchor. */
export declare function elementAnchor(root: HTMLElement, element: HTMLElement): SelectionAnchor | undefined;
/** Resolve a visible-text offset pair back to a DOM Range. */
export declare function rangeForAnchor(root: HTMLElement, start: number, end: number): Range | undefined;
/** Render non-destructive inline highlights through Chromium's Highlight API. */
export declare function applyAnnotationHighlights(root: HTMLElement, annotations: readonly PlanAnnotation[]): () => void;
