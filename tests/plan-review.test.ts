import assert from 'node:assert/strict'
import test from 'node:test'
import {
  approvePlan, planReviewOf, requestPlanChanges, selectPlanReview,
} from '../src/client/plan-review.ts'
import {
  parseStoredDraft, planRevision, renderPlanFeedback,
  type PlanAnnotation,
} from '../src/client/feedback.ts'
import type { QuestionWait } from '../src/client/contracts.ts'
import { en, zh } from '../src/client/locales.ts'

function wait(overrides: Partial<QuestionWait['payload']['questions'][number]> = {}) {
  const calls: unknown[] = []
  const value: QuestionWait = {
    kind: 'question',
    key: 'q:review-1',
    sessionId: 'session-1',
    payload: {
      questions: [{
        id: 'plan-review',
        question: 'Approve this plan?',
        detail: '# Plan\n\n- Ship it',
        options: [{ label: 'Approve' }, { label: 'Keep planning' }],
        intent: { kind: 'plan-review', approve: 'Approve' },
        ...overrides,
      }],
    },
    respond: async result => { calls.push(result); return { accepted: true } },
  }
  return { value, calls }
}

test('claims only an exact, answerable plan review', () => {
  const valid = wait().value
  assert.equal(selectPlanReview({ interactions: [{ kind: 'approval' }, valid] }), valid)
  assert.equal(planReviewOf(wait({ detail: undefined }).value), undefined)
  assert.equal(planReviewOf(wait({ multiSelect: true }).value), undefined)
  assert.equal(planReviewOf(wait({ options: [{ label: 'Keep planning' }] }).value), undefined)
  assert.equal(planReviewOf(wait({ options: [{ label: 'Approve' }, { label: 'No' }, { label: 'Later' }] }).value), undefined)
})
test('uses the exact approve label and custom-only feedback wire shapes', async () => {
  const fixture = wait()
  const review = planReviewOf(fixture.value)
  assert.ok(review)
  await approvePlan(review)
  await requestPlanChanges(review, '# Feedback\n\nAdd tests.')
  assert.deepEqual(fixture.calls, [
    {
      ok: true,
      value: {
        sessionId: 'session-1',
        answer: { answers: [{ id: 'plan-review', selected: ['Approve'] }] },
      },
    },
    {
      ok: true,
      value: {
        sessionId: 'session-1',
        answer: {
          answers: [{ id: 'plan-review', selected: [], custom: '# Feedback\n\nAdd tests.' }],
        },
      },
    },
  ])
})

test('serializes annotations in document order with a stable revision', () => {
  const annotations: PlanAnnotation[] = [
    { id: 'b', start: 20, end: 25, quote: 'later', prefix: '', suffix: '', comment: 'Second', createdAt: 2 },
    { id: 'a', start: 2, end: 7, quote: 'first\nline', prefix: '', suffix: '', comment: 'Add a check', createdAt: 1 },
  ]
  const revision = planRevision('# Plan')
  assert.equal(revision, planRevision('# Plan'))
  const feedback = renderPlanFeedback(annotations, 'Keep compatibility.', revision)
  assert.ok(feedback.indexOf('first') < feedback.indexOf('later'))
  assert.match(feedback, /> first\n> line/)
  assert.match(feedback, /## Overall feedback\n\nKeep compatibility\./)
})

test('rejects malformed and stale browser drafts', () => {
  const revision = planRevision('# Plan')
  assert.equal(parseStoredDraft('{', revision), undefined)
  assert.equal(parseStoredDraft(JSON.stringify({ revision: 'old', annotations: [], general: '' }), revision), undefined)
  assert.equal(parseStoredDraft(JSON.stringify({ revision, annotations: [{ id: 'x' }], general: '' }), revision), undefined)
  assert.deepEqual(
    parseStoredDraft(JSON.stringify({ revision, annotations: [], general: 'Looks good' }), revision),
    { revision, annotations: [], general: 'Looks good' },
  )
})

test('keeps the English and Chinese review surfaces in lockstep', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  for (const [key, value] of Object.entries(zh)) {
    assert.notEqual(value.trim(), '', `${key} must have Chinese copy`)
  }
  assert.match(en.readyHint, /exact plan text/)
  assert.match(zh.readyHint, /计划原文/)
})
