declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react'
  export const MarkdownText: ComponentType<{ readonly text: string }>
  export const Button: ComponentType<{
    readonly variant?: 'primary' | 'ghost' | 'outline' | 'toolbar'
    readonly size?: 'md' | 'sm'
    readonly icon?: ReactNode
  } & ButtonHTMLAttributes<HTMLButtonElement>>
  export const IconChevronRightOutline14: ComponentType<{ readonly size?: number; readonly className?: string }>
  export const IconChevronLeftOutline14: ComponentType<{ readonly size?: number; readonly className?: string }>
  export const IconEditOutline16: ComponentType<{ readonly size?: number; readonly className?: string }>
}

interface HighlightRegistry {
  set(name: string, highlight: Highlight): void
  delete(name: string): boolean
}
interface CSS {
  readonly highlights?: HighlightRegistry
}
declare const Highlight: {
  new (...ranges: AbstractRange[]): Highlight
}
interface Highlight {}
interface Window {
  __ModuleLoader__: {
    load(entry: { id: string; factory: (require: (id: string) => unknown) => unknown }): void
  }
}
