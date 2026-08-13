import type { ClientContext } from './contracts.js'
import { PlannotatorPanel } from './PlannotatorPanel.js'
import { selectPlanReview } from './plan-review.js'
import { installStyles } from './styles.js'

export const name = 'dsh-plannotator-client'
export const inject = ['slots']

/** Replace only DSH's valid plan-review composer surface. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'dsh-plannotator: styles')
  ctx.slots.inject('conversation.composer', () => {
    ctx.slots.register({
      name: 'conversation.composer',
      priority: -10,
      select: selectPlanReview,
    }, PlannotatorPanel)
  })
}

export { PlannotatorPanel } from './PlannotatorPanel.js'
export { planReviewOf, selectPlanReview } from './plan-review.js'
export { renderPlanFeedback } from './feedback.js'
