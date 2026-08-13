/** Copy owned by the Plan Review sidebar. */
export declare const en: {
    readonly header: "Plannotator";
    readonly ready: "Plan ready for review";
    readonly readyHint: "Comment on exact plan text before implementation starts.";
    readonly open: "Open review";
    readonly reopen: "Review plan";
    readonly collapse: "Collapse review sidebar";
    readonly annotationOne: "{count} annotation";
    readonly annotationMany: "{count} annotations";
    readonly selectHint: "Select text for a precise comment, or double-click a plan block.";
    readonly newComment: "New annotation";
    readonly commentPlaceholder: "What should the agent change here?";
    readonly add: "Add comment";
    readonly cancel: "Cancel";
    readonly overall: "Overall feedback";
    readonly overallPlaceholder: "Optional feedback about the plan as a whole…";
    readonly discuss: "Chat about it";
    readonly approve: "Approve";
    readonly approveAnyway: "Approve anyway";
    readonly discardConfirm: "Your unsent annotations will be discarded.";
    readonly sendOne: "Send {count} comment";
    readonly sendMany: "Send {count} comments";
    readonly commentButton: "Comment";
    readonly delete: "Delete annotation {number}";
    readonly shortcut: "Add with Ctrl/⌘ Enter";
};
export type PlannotatorKey = keyof typeof en;
/** Chinese copy mirrors every English key; registration enforces one namespace owner. */
export declare const zh: Record<PlannotatorKey, string>;
