import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Button, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'

/** One question/answer pair in the panel's Ask AI thread. */
export interface AskEntry {
  readonly id: string
  readonly quote?: string
  readonly question: string
  readonly answer: string
  readonly status: 'pending' | 'done' | 'error'
  readonly error?: string
}

export interface AskCopy {
  readonly label: string
  readonly placeholder: string
  readonly send: string
  readonly stop: string
  readonly retry: string
  readonly empty: string
  readonly clearQuote: string
  readonly answering: string
}

/** Ask AI tab: Q&A thread over the reviewed plan plus the question composer. */
export function AskAISection({
  entries,
  draft,
  onDraftChange,
  stagedQuote,
  onClearQuote,
  busy,
  onSend,
  onStop,
  onRetry,
  copy,
  inputId,
}: {
  readonly entries: readonly AskEntry[]
  readonly draft: string
  readonly onDraftChange: (value: string) => void
  readonly stagedQuote: string | null
  readonly onClearQuote: () => void
  readonly busy: boolean
  readonly onSend: () => void
  readonly onStop: () => void
  readonly onRetry: (entry: AskEntry) => void
  readonly copy: AskCopy
  readonly inputId: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (stagedQuote !== null) inputRef.current?.focus()
  }, [stagedQuote])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Stick to the bottom only when the reader is already near it; never yank a
  // scroll position away from earlier content when an entry updates.
  useEffect(() => {
    const list = listRef.current
    if (list === null) return
    const nearBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 48
    if (nearBottom) list.scrollTop = list.scrollHeight
  }, [entries])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (!busy && draft.trim() !== '') onSend()
    }
  }

  return (
    <section className="dsh-plannotator-ask" aria-label={copy.label}>
      <div ref={listRef} className="dsh-plannotator-ask-thread">
        {entries.length === 0 && <div className="dsh-plannotator-empty">{copy.empty}</div>}
        {entries.map(entry => (
          <article className="dsh-plannotator-ask-entry" key={entry.id}>
            {entry.quote !== undefined && <div className="dsh-plannotator-quote">{entry.quote}</div>}
            <div className="dsh-plannotator-ask-question">{entry.question}</div>
            {entry.status === 'pending' && (
              <div className="dsh-plannotator-ask-pending" role="status">{copy.answering}</div>
            )}
            {entry.status === 'done' && (
              <div className="dsh-plannotator-ask-answer"><MarkdownText text={entry.answer} /></div>
            )}
            {entry.status === 'error' && (
              <div className="dsh-plannotator-ask-error" role="alert">
                <span>{entry.error}</span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => { onRetry(entry) }}>
                  {copy.retry}
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="dsh-plannotator-ask-composer">
        {stagedQuote !== null && (
          <div className="dsh-plannotator-ask-quote-chip">
            <span>{stagedQuote}</span>
            <button type="button" aria-label={copy.clearQuote} onClick={onClearQuote}>×</button>
          </div>
        )}
        <label className="dsh-plannotator-visually-hidden" htmlFor={inputId}>{copy.placeholder}</label>
        <textarea
          id={inputId}
          ref={inputRef}
          className="dsh-plannotator-textarea"
          value={draft}
          placeholder={copy.placeholder}
          onChange={event => { onDraftChange(event.target.value) }}
          onKeyDown={onKeyDown}
        />
        <div className="dsh-plannotator-mini-actions">
          {busy
            ? <Button size="sm" variant="outline" onClick={onStop}>{copy.stop}</Button>
            : (
              <Button
                size="sm"
                className="dsh-plannotator-blue-button"
                disabled={draft.trim() === ''}
                onClick={onSend}
              >{copy.send}</Button>
            )}
        </div>
      </div>
    </section>
  )
}
