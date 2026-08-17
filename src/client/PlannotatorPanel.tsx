import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type KeyboardEvent, type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Button, IconChevronLeftOutline14, IconChevronRightOutline14, IconEditOutline16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { QuestionWait, Translate } from './contracts.js'
import { AskAISection, type AskCopy, type AskEntry } from './AskAISection.js'
import { forgetAskThread, useAskThread } from './ask-thread.js'
import {
  parseStoredDraft, planRevision, renderPlanFeedback,
  type PlanAnnotation,
} from './feedback.js'
import {
  approvePlan, dismissPlanReview, planReviewOf, requestPlanChanges,
  type PlanReview,
} from './plan-review.js'
import {
  applyAnnotationHighlights, elementAnchor, rangeForAnchor, selectionAnchor,
  type SelectionAnchor,
} from './selection.js'
import { panelModeForWidth, type PanelMode } from './layout.js'
import { newId } from '../shared/id.js'

interface Copy {
  header: string
  ready: string
  readyHint: string
  open: string
  reopen: string
  collapse: string
  annotation: (count: number) => string
  selectHint: string
  newComment: string
  commentPlaceholder: string
  add: string
  cancel: string
  overall: string
  overallPlaceholder: string
  discuss: string
  approve: string
  approveAnyway: string
  discardConfirm: string
  send: (count: number) => string
  commentButton: string
  delete: (number: number) => string
  goTo: (number: number) => string
  shortcut: string
  askTab: string
  askButton: string
  askCancelled: string
  ask: AskCopy
}

function readPanelMode(): PanelMode {
  return panelModeForWidth(window.innerWidth)
}

function usePanelMode(): PanelMode {
  const [mode, setMode] = useState<PanelMode>(readPanelMode)

  useEffect(() => {
    const docked = window.matchMedia('(min-width: 1480px)')
    const sheet = window.matchMedia('(max-width: 640px)')
    const sync = (): void => { setMode(sheet.matches ? 'sheet' : docked.matches ? 'docked' : 'drawer') }
    docked.addEventListener('change', sync)
    sheet.addEventListener('change', sync)
    return () => {
      docked.removeEventListener('change', sync)
      sheet.removeEventListener('change', sync)
    }
  }, [])

  return mode
}

function copyOf(t: Translate): Copy {
  return {
    header: t('header'),
    ready: t('ready'),
    readyHint: t('readyHint'),
    open: t('open'),
    reopen: t('reopen'),
    collapse: t('collapse'),
    annotation: count => t(count === 1 ? 'annotationOne' : 'annotationMany', { count }),
    selectHint: t('selectHint'),
    newComment: t('newComment'),
    commentPlaceholder: t('commentPlaceholder'),
    add: t('add'),
    cancel: t('cancel'),
    overall: t('overall'),
    overallPlaceholder: t('overallPlaceholder'),
    discuss: t('discuss'),
    approve: t('approve'),
    approveAnyway: t('approveAnyway'),
    discardConfirm: t('discardConfirm'),
    send: count => t(count === 1 ? 'sendOne' : 'sendMany', { count }),
    commentButton: t('commentButton'),
    delete: number => t('delete', { number }),
    goTo: number => t('goTo', { number }),
    shortcut: t('shortcut'),
    askTab: t('askTab'),
    askButton: t('askButton'),
    askCancelled: t('askCancelled'),
    ask: {
      label: t('askTab'),
      placeholder: t('askPlaceholder'),
      send: t('askSend'),
      stop: t('askStop'),
      retry: t('askRetry'),
      empty: t('askEmpty'),
      clearQuote: t('askClearQuote'),
      answering: t('askAnswering'),
    },
  }
}

function draftKey(wait: QuestionWait): string {
  return `dsh-plannotator:draft:v1:${wait.sessionId}:${wait.key}`
}

function readDraft(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeDraft(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* Draft recovery is best-effort. */ }
}

function removeDraft(key: string): void {
  try { localStorage.removeItem(key) } catch { /* Draft recovery is best-effort. */ }
}

export function PlannotatorPanel({
  matched,
  t,
}: {
  readonly matched: QuestionWait
  readonly t: Translate
}) {
  const review = planReviewOf(matched)
  if (review === undefined) return null
  return <PlannotatorReview key={`${matched.sessionId}:${matched.key}`} matched={matched} review={review} t={t} />
}

function PlannotatorReview({
  matched, review, t,
}: {
  readonly matched: QuestionWait
  readonly review: PlanReview
  readonly t: Translate
}) {
  // DSH keeps the namespace translator identity stable across locale changes.
  // Resolve copy on every render so a locale revision is reflected immediately.
  const copy = copyOf(t)
  const revision = useMemo(() => planRevision(review.plan), [review.plan])
  const storageKey = useMemo(() => draftKey(matched), [matched])
  const restored = useMemo(() => parseStoredDraft(readDraft(storageKey), revision), [storageKey, revision])
  const [annotations, setAnnotations] = useState<readonly PlanAnnotation[]>(restored?.annotations ?? [])
  const [general, setGeneral] = useState(restored?.general ?? '')
  const [selection, setSelection] = useState<SelectionAnchor | null>(null)
  const [comment, setComment] = useState('')
  const [commentAttention, setCommentAttention] = useState(false)
  const [askDraft, setAskDraft] = useState('')
  const [askQuote, setAskQuote] = useState<string | null>(null)
  const askThread = useAskThread(matched, review.plan, copy.askCancelled)
  const [busy, setBusy] = useState<'approve' | 'feedback' | 'dismiss' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const mode = usePanelMode()
  const previousMode = useRef(mode)
  const [openByMode, setOpenByMode] = useState<Record<PanelMode, boolean>>({
    docked: true,
    drawer: false,
    sheet: false,
  })
  const panelOpen = openByMode[mode]
  const panelId = `dsh-plannotator-panel-${useId().replaceAll(':', '')}`
  const documentRef = useRef<HTMLDivElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const attentionTimer = useRef<number | null>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const panelTitleRef = useRef<HTMLHeadingElement>(null)

  /** Clear the staged annotation selection, its comment box, and the native selection. */
  const clearSelection = useCallback((): void => {
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setComment('')
  }, [])

  /** Adopt a freshly captured selection, resetting the comment draft and the approve-confirm gate. */
  const adoptSelection = useCallback((next: SelectionAnchor): void => {
    setSelection(next)
    setComment('')
    setConfirmApprove(false)
  }, [])

  useEffect(() => {
    if (annotations.length === 0 && general.trim() === '') {
      removeDraft(storageKey)
      return
    }
    writeDraft(storageKey, JSON.stringify({ revision, annotations, general }))
  }, [annotations, general, revision, storageKey])

  useEffect(() => {
    const root = documentRef.current
    if (root === null) return
    return applyAnnotationHighlights(root, annotations)
  }, [annotations, panelOpen])

  useEffect(() => {
    if (selection !== null) commentRef.current?.focus()
  }, [selection])

  useEffect(() => () => {
    if (attentionTimer.current !== null) window.clearTimeout(attentionTimer.current)
  }, [])

  useEffect(() => {
    if (previousMode.current === mode) return
    previousMode.current = mode
    clearSelection()
  }, [mode, clearSelection])

  const openPanel = (): void => {
    setOpenByMode(current => ({ ...current, [mode]: true }))
    requestAnimationFrame(() => { panelTitleRef.current?.focus() })
  }
  const closePanel = (): void => {
    clearSelection()
    setOpenByMode(current => ({ ...current, [mode]: false }))
    requestAnimationFrame(() => { launcherRef.current?.focus() })
  }

  const captureSelection = useCallback(() => {
    const root = documentRef.current
    if (root === null) return
    const next = selectionAnchor(root)
    if (next !== undefined) {
      adoptSelection(next)
    }
  }, [])

  const captureBlock = (event: MouseEvent<HTMLDivElement>): void => {
    const root = documentRef.current
    if (root === null || !(event.target instanceof Element)) return
    const block = event.target.closest('p,li,h1,h2,h3,h4,h5,h6,strong,code')
    if (!(block instanceof HTMLElement)) return
    const next = elementAnchor(root, block)
    if (next === undefined) return
    adoptSelection(next)
  }

  const repositionSelection = (): void => {
    const root = documentRef.current
    if (root === null) return
    setSelection(current => {
      if (current === null) return null
      const range = rangeForAnchor(root, current.start, current.end)
      if (range === undefined) return current
      const rect = range.getBoundingClientRect()
      if (rect.left === current.rect.left && rect.bottom === current.rect.bottom) return current
      return { ...current, rect: { left: rect.left, bottom: rect.bottom } }
    })
  }

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Shift' || event.shiftKey) captureSelection()
  }

  /** Bring the new-comment box for the active selection into view and focus it. */
  const focusComment = (): void => {
    const box = commentRef.current
    if (box !== null) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      box.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
      box.focus()
    }
    setCommentAttention(true)
    if (attentionTimer.current !== null) window.clearTimeout(attentionTimer.current)
    attentionTimer.current = window.setTimeout(() => { setCommentAttention(false) }, 600)
  }

  const addComment = (): void => {
    if (selection === null || comment.trim() === '') return
    setAnnotations(current => [...current, {
      id: newId('annotation'),
      start: selection.start,
      end: selection.end,
      quote: selection.quote,
      prefix: selection.prefix,
      suffix: selection.suffix,
      comment: comment.trim(),
      createdAt: Date.now(),
    }])
    clearSelection()
  }

  /** Move the current selection into the always-visible Ask AI composer as a quoted excerpt. */
  const beginAsk = (): void => {
    if (selection === null) return
    setAskQuote(selection.quote)
    clearSelection()
  }

  const sendAsk = (): void => {
    // Clear the composer only when the question was actually accepted; a
    // rejected send (busy gate) must not eat what the user typed.
    if (askThread.send({ question: askDraft, quote: askQuote })) {
      setAskDraft('')
      setAskQuote(null)
    }
  }

  const retryAsk = (entry: AskEntry): void => { askThread.retry(entry) }

  const stopAsk = (): void => { askThread.stop() }

  const settle = (kind: 'approve' | 'feedback' | 'dismiss', send: () => Promise<void>): void => {
    setBusy(kind)
    setError(null)
    void send().then(() => {
      removeDraft(storageKey)
      // The review is settled: release its Ask AI thread (memory + storage).
      forgetAskThread(matched)
    }).catch((cause: unknown) => {
      setBusy(null)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }

  const hasFeedback = annotations.length > 0 || general.trim() !== ''
  const sendFeedback = (): void => {
    const feedback = renderPlanFeedback(annotations, general, revision)
    settle('feedback', () => requestPlanChanges(review, feedback))
  }
  const approve = (): void => {
    if (hasFeedback && !confirmApprove) {
      setConfirmApprove(true)
      return
    }
    settle('approve', () => approvePlan(review))
  }

  const focusAnnotation = (annotation: PlanAnnotation): void => {
    const root = documentRef.current
    if (root === null) return
    const range = rangeForAnchor(root, annotation.start, annotation.end)
    const element = range?.startContainer.parentElement
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    element?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const feedbackCount = annotations.length + (general.trim() === '' ? 0 : 1)
  const panel = panelOpen ? (
    <aside
      id={panelId}
      className="dsh-plannotator-panel"
      aria-labelledby={`${panelId}-title`}
      aria-busy={busy !== null || undefined}
      data-dsh-plannotator=""
      data-plan-review-panel=""
      data-panel-mode={mode}
    >
      <header className="dsh-plannotator-panel-header">
        <div className="dsh-plannotator-panel-heading">
          <span className="dsh-plannotator-dot" />
          <div>
            <h2 id={`${panelId}-title`} ref={panelTitleRef} tabIndex={-1}>{copy.header}</h2>
            <span>{copy.annotation(annotations.length)}</span>
          </div>
        </div>
        <button
          type="button"
          className="dsh-plannotator-collapse"
          aria-label={copy.collapse}
          aria-controls={panelId}
          aria-expanded="true"
          onClick={closePanel}
        >
          <IconChevronRightOutline14 />
        </button>
      </header>

      <div className="dsh-plannotator-workspace">
        <aside className="dsh-plannotator-ask-rail" aria-label={copy.askTab}>
          <div className="dsh-plannotator-ask-rail-title">{copy.askTab}</div>
          <AskAISection
            entries={askThread.entries}
            draft={askDraft}
            onDraftChange={setAskDraft}
            stagedQuote={askQuote}
            onClearQuote={() => { setAskQuote(null) }}
            busy={askThread.busy}
            onSend={sendAsk}
            onStop={stopAsk}
            onRetry={retryAsk}
            copy={copy.ask}
            inputId={`${panelId}-ask`}
          />
        </aside>

        <div className="dsh-plannotator-plan-side">
          <div
            ref={documentRef}
            className="dsh-plannotator-document"
            data-plannotator-document=""
            onMouseUp={captureSelection}
            onDoubleClick={captureBlock}
            onKeyUp={onKeyUp}
            onScroll={repositionSelection}
          >
            <MarkdownText text={review.plan} />
          </div>

          {selection !== null && (
            <div
              className="dsh-plannotator-selection-action"
              style={{
                left: Math.min(window.innerWidth - 220, Math.max(8, selection.rect.left)),
                top: Math.min(window.innerHeight - 48, selection.rect.bottom),
              }}
              onMouseDown={(event: MouseEvent) => { event.preventDefault() }}
            >
              {/* The annotations view is always active; keep the selection so the
                  new-comment box below stays open on the quoted text. The action
                  only brings that box into view and focuses it — it must never
                  clear a typed draft (clearing is the selection capture's job)
                  nor create an annotation (that is the Add button's job). */}
              <button type="button" onClick={focusComment}>
                ＋ {copy.commentButton}
              </button>
              <button type="button" onClick={beginAsk}>
                ✦ {copy.askButton}
              </button>
            </div>
          )}

          <section className="dsh-plannotator-review" aria-label={copy.annotation(annotations.length)}>
            <div className="dsh-plannotator-review-title">
              <span>{copy.annotation(annotations.length)}</span>
              <span>{copy.shortcut}</span>
            </div>
            {selection !== null && (
              <section className={commentAttention
                ? 'dsh-plannotator-new dsh-plannotator-new-attention'
                : 'dsh-plannotator-new'}>
                <div className="dsh-plannotator-annotation-head"><strong>{copy.newComment}</strong></div>
                <div className="dsh-plannotator-quote">{selection.quote}</div>
                <label className="dsh-plannotator-visually-hidden" htmlFor={`${panelId}-comment`}>{copy.newComment}</label>
                <textarea
                  id={`${panelId}-comment`}
                  ref={commentRef}
                  className="dsh-plannotator-textarea"
                  value={comment}
                  placeholder={copy.commentPlaceholder}
                  onChange={event => { setComment(event.target.value) }}
                  onKeyDown={event => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') addComment()
                    if (event.key === 'Escape') { setSelection(null); setComment('') }
                  }}
                />
                <div className="dsh-plannotator-mini-actions">
                  <Button size="sm" variant="ghost" onClick={() => { setSelection(null); setComment('') }}>{copy.cancel}</Button>
                  <Button size="sm" className="dsh-plannotator-blue-button" disabled={comment.trim() === ''} onClick={addComment}>{copy.add}</Button>
                </div>
              </section>
            )}
            {annotations.map((annotation, index) => (
              <section className="dsh-plannotator-annotation" key={annotation.id}>
                <div className="dsh-plannotator-annotation-head">
                  <button
                    type="button"
                    className="dsh-plannotator-icon-button"
                    aria-label={copy.goTo(index + 1)}
                    onClick={() => { focusAnnotation(annotation) }}
                  >#{index + 1}</button>
                  <button
                    type="button"
                    className="dsh-plannotator-icon-button"
                    aria-label={copy.delete(index + 1)}
                    onClick={() => {
                      setAnnotations(current => current.filter(item => item.id !== annotation.id))
                      setConfirmApprove(false)
                    }}
                  >×</button>
                </div>
                <button type="button" className="dsh-plannotator-icon-button dsh-plannotator-quote" onClick={() => { focusAnnotation(annotation) }}>{annotation.quote}</button>
                <div className="dsh-plannotator-comment">{annotation.comment}</div>
              </section>
            ))}
            {selection === null && annotations.length === 0 && <div className="dsh-plannotator-empty">{copy.selectHint}</div>}
            <section className="dsh-plannotator-general">
              <label className="dsh-plannotator-annotation-head" htmlFor={`${panelId}-overall`}><strong>{copy.overall}</strong></label>
              <textarea
                id={`${panelId}-overall`}
                className="dsh-plannotator-textarea"
                value={general}
                placeholder={copy.overallPlaceholder}
                onChange={event => { setGeneral(event.target.value); setConfirmApprove(false) }}
              />
            </section>
          </section>
        </div>
      </div>

      <footer className="dsh-plannotator-footer">
        {error !== null
          ? <div className="dsh-plannotator-status" role="alert">{error}</div>
          : <div className="dsh-plannotator-status" role="status" aria-live="polite">{confirmApprove ? copy.discardConfirm : ''}</div>}
        <div className="dsh-plannotator-actions">
          <Button
            size="sm" variant="ghost" icon={<IconEditOutline16 size={14} />}
            disabled={busy !== null}
            onClick={() => { settle('dismiss', () => dismissPlanReview(review)) }}
          >{copy.discuss}</Button>
          <Button
            size="sm"
            variant="outline"
            className={hasFeedback ? 'dsh-plannotator-blue-button' : undefined}
            disabled={busy !== null || !hasFeedback}
            onClick={sendFeedback}
          >{busy === 'feedback' ? '…' : copy.send(feedbackCount)}</Button>
          <Button
            size="sm"
            variant="outline"
            className={confirmApprove
              ? 'dsh-plannotator-danger-button'
              : hasFeedback ? undefined : 'dsh-plannotator-blue-button'}
            disabled={busy !== null}
            onClick={approve}
          >{busy === 'approve' ? '…' : (confirmApprove ? copy.approveAnyway : copy.approve)}</Button>
        </div>
      </footer>
    </aside>
  ) : mode === 'docked' ? (
    <button
      type="button"
      className="dsh-plannotator-rail-button"
      data-panel-mode={mode}
      aria-label={copy.open}
      aria-expanded="false"
      onClick={openPanel}
    >
      <IconChevronLeftOutline14 />
      <span>{copy.reopen}</span>
      {annotations.length > 0 && <strong>{annotations.length}</strong>}
    </button>
  ) : null

  return (
    <>
      <div className="dsh-plannotator-launcher" data-plan-review-key={matched.key} data-dsh-plannotator-launcher="">
        <span className="dsh-plannotator-dot" />
        <div className="dsh-plannotator-launcher-copy">
          <strong>{copy.ready}</strong>
          <span>{copy.readyHint}</span>
        </div>
        <button
          type="button"
          ref={launcherRef}
          className="dsh-plannotator-blue-button"
          aria-controls={panelOpen ? panelId : undefined}
          aria-expanded={panelOpen}
          onClick={openPanel}
        >{copy.open}</button>
      </div>
      {createPortal(panel, document.body)}
    </>
  )
}
