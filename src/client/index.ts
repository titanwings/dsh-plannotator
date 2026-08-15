import type { ClientContext, ConnectionLike } from './contracts.js'
import { setAskAiConnection } from './ask-ai.js'
import { PlannotatorPanel } from './PlannotatorPanel.js'
import { selectPlanReview } from './plan-review.js'
import { installStyles } from './styles.js'
import { en, zh } from './locales.js'

export const name = 'dsh-plannotator-client'
export const inject = ['slots', 'locale']
const NS = 'dsh-plannotator'

/** Replace only DSH's valid plan-review composer surface. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'dsh-plannotator: styles')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plannotator: locale')
  ctx.effect(() => {
    setAskAiConnection(ctx.get('connection') as ConnectionLike | undefined)
    return () => { setAskAiConnection(undefined) }
  }, 'dsh-plannotator: ask-ai connection')
  ctx.slots.inject('conversation.composer', () => ctx.slots.register({
      name: 'conversation.composer',
      priority: -10,
      locale: NS,
      select: selectPlanReview,
    }, PlannotatorPanel))
}

export { PlannotatorPanel } from './PlannotatorPanel.js'
export { planReviewOf, selectPlanReview } from './plan-review.js'
export { renderPlanFeedback } from './feedback.js'
