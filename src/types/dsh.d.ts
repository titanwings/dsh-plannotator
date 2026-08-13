declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ComponentType } from 'react'
  export const MarkdownText: ComponentType<{ readonly text: string }>
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
