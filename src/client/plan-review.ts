import type {
  ComposerChainProps, QuestionOption, QuestionWait,
} from './contracts.js'

export interface PlanReview {
  readonly wait: QuestionWait
  readonly id: string
  readonly question: string
  readonly plan: string
  readonly approve: QuestionOption
  readonly decline?: QuestionOption
}
/**
 * Narrow one DSH question wait to the exact binary plan-review protocol.
 * Unknown/malformed requests are left to the built-in question renderer.
 */
export function planReviewOf(wait: QuestionWait): PlanReview | undefined {
  const questions = wait.payload.questions
  if (questions.length !== 1) return undefined
  const question = questions[0]
  if (question === undefined) return undefined
  if (question.intent?.kind !== 'plan-review' || question.detail === undefined) return undefined
  if (question.multiSelect === true) return undefined
  const options = question.options ?? []
  if (options.length === 0 || options.length > 2) return undefined
  const approveLabel = question.intent.approve
  if (approveLabel === undefined) return undefined
  const approve = options.find(option => option.label === approveLabel)
  if (approve === undefined) return undefined
  const decline = options.find(option => option.label !== approveLabel)
  return {
    wait,
    id: question.id,
    question: question.question,
    plan: question.detail,
    approve,
    ...(decline === undefined ? {} : { decline }),
  }
}

/** Claim only a valid plan review and preserve the PendingWait's identity. */
export function selectPlanReview({ interactions }: ComposerChainProps): QuestionWait | null {
  for (const interaction of interactions) {
    if (interaction.kind !== 'question') continue
    const wait = interaction as QuestionWait
    if (planReviewOf(wait) !== undefined) return wait
  }
  return null
}

async function accepted(receipt: Promise<{ accepted: boolean; reason?: string }>): Promise<void> {
  const result = await receipt
  if (!result.accepted) {
    throw new Error(`plan review response rejected: ${result.reason ?? 'unknown reason'}`)
  }
}

/** Approve with the asker's exact option label. */
export function approvePlan(review: PlanReview): Promise<void> {
  return accepted(review.wait.respond({
    ok: true,
    value: {
      sessionId: review.wait.sessionId,
      answer: { answers: [{ id: review.id, selected: [review.approve.label] }] },
    },
  }))
}

/**
 * Return custom feedback. DSH single-select answers require custom text and
 * selected options to be mutually exclusive, hence selected: [].
 */
export function requestPlanChanges(review: PlanReview, feedback: string): Promise<void> {
  if (feedback.trim() === '') throw new Error('plan review feedback must not be empty')
  return accepted(review.wait.respond({
    ok: true,
    value: {
      sessionId: review.wait.sessionId,
      answer: { answers: [{ id: review.id, selected: [], custom: feedback }] },
    },
  }))
}

/** Dismiss the wait so the ordinary DSH composer returns for discussion. */
export function dismissPlanReview(review: PlanReview): Promise<void> {
  return accepted(review.wait.respond({
    ok: false,
    error: {
      code: 'cancelled',
      message: 'the user closed this plan review to discuss it',
      details: {},
    },
  }))
}
