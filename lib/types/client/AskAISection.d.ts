/** One question/answer pair in the panel's Ask AI thread. */
export interface AskEntry {
    readonly id: string;
    readonly quote?: string;
    readonly question: string;
    readonly answer: string;
    readonly status: 'pending' | 'done' | 'error';
    readonly error?: string;
}
export interface AskCopy {
    readonly label: string;
    readonly placeholder: string;
    readonly send: string;
    readonly stop: string;
    readonly retry: string;
    readonly empty: string;
    readonly clearQuote: string;
    readonly answering: string;
}
/** Ask AI tab: Q&A thread over the reviewed plan plus the question composer. */
export declare function AskAISection({ entries, draft, onDraftChange, stagedQuote, onClearQuote, busy, onSend, onStop, onRetry, copy, inputId, }: {
    readonly entries: readonly AskEntry[];
    readonly draft: string;
    readonly onDraftChange: (value: string) => void;
    readonly stagedQuote: string | null;
    readonly onClearQuote: () => void;
    readonly busy: boolean;
    readonly onSend: () => void;
    readonly onStop: () => void;
    readonly onRetry: (entry: AskEntry) => void;
    readonly copy: AskCopy;
    readonly inputId: string;
}): import("react").JSX.Element;
