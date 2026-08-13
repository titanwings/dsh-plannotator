import {
  useCallback, useEffect, useMemo, useRef, useState,
  type KeyboardEvent, type MouseEvent,
} from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { QuestionWait } from './contracts.js'
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

interface Copy {
  header: string
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
  delete: string
}

const EN: Copy = {
  header: 'Plannotator · Plan review',
  annotation: count => `${count} annotation${count === 1 ? '' : 's'}`,
  selectHint: 'Select text for a precise comment, or double-click a plan block.',
  newComment: 'New annotation',
  commentPlaceholder: 'What should the agent change here?',
  add: 'Add comment',
  cancel: 'Cancel',
  overall: 'Overall feedback',
  overallPlaceholder: 'Optional feedback about the plan as a whole…',
  discuss: 'Chat about it',
  approve: 'Approve',
  approveAnyway: 'Approve anyway',
  discardConfirm: 'Your unsent annotations will be discarded.',
  send: count => `Send ${count} comment${count === 1 ? '' : 's'}`,
  commentButton: 'Comment',
  delete: 'Delete annotation',
}

const ZH: Copy = {
  header: 'Plannotator · 计划审阅',
  annotation: count => `${count} 条批注`,
  selectHint: '拖选文字做精确批注，或双击任意计划块快速批注。',
  newComment: '新批注',
  commentPlaceholder: '希望 Agent 在这里修改什么？',
  add: '添加批注',
  cancel: '取消',
  overall: '整体意见',
  overallPlaceholder: '对整份计划的补充意见（可选）…',
  discuss: '继续讨论',
  approve: '批准计划',
  approveAnyway: '仍然批准',
  discardConfirm: '尚未发送的批注将被丢弃。',
  send: count => `发送 ${count} 条反馈`,
  commentButton: '添加批注',
  delete: '删除批注',
}

function draftKey(wait: QuestionWait): string {
  return `dsh-plannotator:draft:v1:${wait.sessionId}:${wait.key}`
}

function annotationId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`
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

export function PlannotatorPanel({ matched }: { readonly matched: QuestionWait }) {
  const review = planReviewOf(matched)
  if (review === undefined) return null
  return <PlannotatorReview key={`${matched.sessionId}:${matched.key}`} matched={matched} review={review} />
}

function PlannotatorReview({
  matched, review,
}: {
  readonly matched: QuestionWait
  readonly review: PlanReview
}) {
  const copy = document.documentElement.lang.toLowerCase().startsWith('zh') ? ZH : EN
  const revision = useMemo(() => planRevision(review.plan), [review.plan])
  const storageKey = useMemo(() => draftKey(matched), [matched])
  const restored = useMemo(() => parseStoredDraft(readDraft(storageKey), revision), [storageKey, revision])
  const [annotations, setAnnotations] = useState<readonly PlanAnnotation[]>(restored?.annotations ?? [])
  const [general, setGeneral] = useState(restored?.general ?? '')
  const [selection, setSelection] = useState<SelectionAnchor | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<'approve' | 'feedback' | 'dismiss' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const documentRef = useRef<HTMLDivElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)

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
  }, [annotations])

  useEffect(() => {
    if (selection !== null) commentRef.current?.focus()
  }, [selection])

  const captureSelection = useCallback(() => {
    const root = documentRef.current
    if (root === null) return
    const next = selectionAnchor(root)
    if (next !== undefined) {
      setSelection(next)
      setComment('')
      setConfirmApprove(false)
    }
  }, [])

  const captureBlock = (event: MouseEvent<HTMLDivElement>): void => {
    const root = documentRef.current
    if (root === null || !(event.target instanceof Element)) return
    const block = event.target.closest('p,li,h1,h2,h3,h4,h5,h6,strong,code')
    if (!(block instanceof HTMLElement)) return
    const next = elementAnchor(root, block)
    if (next === undefined) return
    setSelection(next)
    setComment('')
    setConfirmApprove(false)
  }

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Shift' || event.shiftKey) captureSelection()
  }

  const addComment = (): void => {
    if (selection === null || comment.trim() === '') return
    setAnnotations(current => [...current, {
      id: annotationId(),
      start: selection.start,
      end: selection.end,
      quote: selection.quote,
      prefix: selection.prefix,
      suffix: selection.suffix,
      comment: comment.trim(),
      createdAt: Date.now(),
    }])
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    setComment('')
  }

  const settle = (kind: 'approve' | 'feedback' | 'dismiss', send: () => Promise<void>): void => {
    setBusy(kind)
    setError(null)
    void send().then(() => {
      removeDraft(storageKey)
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
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <div className="dsh-plannotator-frame" data-plan-review-key={matched.key} data-dsh-plannotator="">
      <section className="dsh-plannotator-card" aria-label={review.question}>
        <header className="dsh-plannotator-strip">
          <span className="dsh-plannotator-brand"><span className="dsh-plannotator-dot" />{copy.header}</span>
          <span className="dsh-plannotator-count">{copy.annotation(annotations.length)}</span>
        </header>
        <div className="dsh-plannotator-workspace">
          <div
            ref={documentRef}
            className="dsh-plannotator-document"
            data-plannotator-document=""
            onMouseUp={captureSelection}
            onDoubleClick={captureBlock}
            onKeyUp={onKeyUp}
          >
            <MarkdownText text={review.plan} />
          </div>
          {selection !== null && (
            <button
              type="button"
              className="dsh-plannotator-selection-action"
              style={{ left: Math.max(8, selection.rect.left), top: selection.rect.bottom }}
              onMouseDown={(event: MouseEvent) => { event.preventDefault() }}
              onClick={() => { commentRef.current?.focus() }}
            >
              ＋ {copy.commentButton}
            </button>
          )}
          <aside className="dsh-plannotator-rail" aria-label={copy.annotation(annotations.length)}>
            <div className="dsh-plannotator-rail-title"><span>{copy.annotation(annotations.length)}</span><span>Ctrl/⌘ ↵</span></div>
            {selection !== null && (
              <section className="dsh-plannotator-new">
                <div className="dsh-plannotator-annotation-head"><strong>{copy.newComment}</strong></div>
                <div className="dsh-plannotator-quote">{selection.quote}</div>
                <textarea
                  ref={commentRef}
                  className="dsh-plannotator-textarea"
                  value={comment}
                  aria-label={copy.newComment}
                  placeholder={copy.commentPlaceholder}
                  onChange={event => { setComment(event.target.value) }}
                  onKeyDown={event => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') addComment()
                    if (event.key === 'Escape') { setSelection(null); setComment('') }
                  }}
                />
                <div className="dsh-plannotator-mini-actions">
                  <button type="button" className="dsh-plannotator-button" onClick={() => { setSelection(null); setComment('') }}>{copy.cancel}</button>
                  <button type="button" className="dsh-plannotator-button dsh-plannotator-button-warn" disabled={comment.trim() === ''} onClick={addComment}>{copy.add}</button>
                </div>
              </section>
            )}
            {annotations.map((annotation, index) => (
              <section className="dsh-plannotator-annotation" key={annotation.id}>
                <div className="dsh-plannotator-annotation-head">
                  <button type="button" className="dsh-plannotator-icon-button" onClick={() => { focusAnnotation(annotation) }}>#{index + 1}</button>
                  <button type="button" className="dsh-plannotator-icon-button" aria-label={copy.delete} onClick={() => { setAnnotations(current => current.filter(item => item.id !== annotation.id)) }}>×</button>
                </div>
                <button type="button" className="dsh-plannotator-icon-button dsh-plannotator-quote" onClick={() => { focusAnnotation(annotation) }}>{annotation.quote}</button>
                <div className="dsh-plannotator-comment">{annotation.comment}</div>
              </section>
            ))}
            {selection === null && annotations.length === 0 && <div className="dsh-plannotator-empty">{copy.selectHint}</div>}
            <section className="dsh-plannotator-general">
              <div className="dsh-plannotator-annotation-head"><strong>{copy.overall}</strong></div>
              <textarea className="dsh-plannotator-textarea" value={general} aria-label={copy.overall} placeholder={copy.overallPlaceholder} onChange={event => { setGeneral(event.target.value); setConfirmApprove(false) }} />
            </section>
          </aside>
        </div>
        <footer className="dsh-plannotator-footer">
          <div className="dsh-plannotator-status" role="status">{error ?? (confirmApprove ? copy.discardConfirm : '')}</div>
          <div className="dsh-plannotator-actions">
            <button type="button" className="dsh-plannotator-button" disabled={busy !== null} onClick={() => { settle('dismiss', () => dismissPlanReview(review)) }}>{copy.discuss}</button>
            <button type="button" className="dsh-plannotator-button dsh-plannotator-button-warn" disabled={busy !== null || !hasFeedback} onClick={sendFeedback}>{busy === 'feedback' ? '…' : copy.send(annotations.length + (general.trim() === '' ? 0 : 1))}</button>
            <button type="button" className="dsh-plannotator-button dsh-plannotator-button-primary" disabled={busy !== null} onClick={approve}>{busy === 'approve' ? '…' : (confirmApprove ? copy.approveAnyway : copy.approve)}</button>
          </div>
        </footer>
      </section>
    </div>
  )
}
