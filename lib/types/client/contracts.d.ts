import type { ComponentType } from 'react';
import type { PlannotatorKey } from './locales.js';
export type Translate = (key: PlannotatorKey, params?: Record<string, unknown>) => string;
export interface QuestionOption {
    readonly label: string;
    readonly description?: string;
}
export interface QuestionItem {
    readonly id: string;
    readonly header?: string;
    readonly question: string;
    readonly detail?: string;
    readonly options?: readonly QuestionOption[];
    readonly multiSelect?: boolean;
    readonly intent?: {
        readonly kind: string;
        readonly approve?: string;
    };
}
export interface QuestionAnswer {
    readonly answers: readonly {
        readonly id: string;
        readonly selected: readonly string[];
        readonly custom?: string;
    }[];
}
export interface RpcReceipt {
    readonly accepted: boolean;
    readonly reason?: string;
}
export interface QuestionWait {
    readonly kind: 'question';
    readonly key: string;
    readonly sessionId: string;
    readonly payload: {
        readonly questions: readonly QuestionItem[];
    };
    respond(result: {
        readonly ok: true;
        readonly value: {
            readonly sessionId: string;
            readonly answer: QuestionAnswer;
        };
    } | {
        readonly ok: false;
        readonly error: {
            readonly code: string;
            readonly message: string;
            readonly details: object;
        };
    }): Promise<RpcReceipt>;
}
export interface ComposerChainProps {
    readonly interactions: readonly {
        readonly kind: string;
    }[];
}
export interface SlotRegistrationOptions {
    readonly name: 'conversation.composer';
    readonly priority: number;
    readonly locale: string;
    readonly select: (props: ComposerChainProps) => QuestionWait | null;
}
/** Generic Connection RPC result (`{ ok, value | error }`) as the client receives it. */
export type RpcResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: {
        readonly code: string;
        readonly message: string;
    };
};
/** Minimal face of `ctx.connection` (dsh-client-connection) used by Ask AI. */
export interface ConnectionLike {
    readonly rpc: {
        call(channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<RpcResult<unknown>>;
    };
}
export interface ClientContext {
    effect(factory: () => void | (() => void), label?: string): void;
    /** Optional service lookup (Cordis `ctx.get`); absent services return undefined. */
    get(name: string): unknown;
    locale: {
        register(namespace: string, dictionaries: {
            readonly zh: Record<string, string>;
            readonly en: Record<string, string>;
        }): () => void;
    };
    slots: {
        inject(name: 'conversation.composer', register: () => void | (() => void)): void;
        register(options: SlotRegistrationOptions, component: ComponentType<{
            readonly matched: QuestionWait;
            readonly t: Translate;
        }>): () => void;
    };
}
