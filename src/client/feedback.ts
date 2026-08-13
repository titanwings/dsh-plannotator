export interface PlanAnnotation {
  readonly id: string
  readonly start: number
  readonly end: number
  readonly quote: string
  readonly prefix: string
  readonly suffix: string
  readonly comment: string
  readonly createdAt: number
}
export interface ReviewDraft {
  readonly revision: string
  readonly annotations: readonly PlanAnnotation[]
  readonly general: string
}

/** Small deterministic content stamp; used only to reject a stale browser draft. */
export function planRevision(plan: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < plan.length; index += 1) {
    hash ^= plan.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function blockquote(value: string): string {
  return value.split('\n').map(line => `> ${line}`).join('\n')
}

/** Stable agent-facing Markdown, ordered by document position. */
export function renderPlanFeedback(
  annotations: readonly PlanAnnotation[],
  general: string,
  revision: string,
): string {
  const ordered = [...annotations].sort((left, right) =>
    left.start - right.start || left.createdAt - right.createdAt || left.id.localeCompare(right.id))
  const sections = ordered.map((annotation, index) => [
    `## ${index + 1}. Comment on selected plan text`,
    '',
    blockquote(annotation.quote),
    '',
    `**Requested change:** ${annotation.comment.trim()}`,
  ].join('\n'))
  if (general.trim() !== '') {
    sections.push([
      '## Overall feedback',
      '',
      general.trim(),
    ].join('\n'))
  }
  return [
    '# Plan Review Feedback',
    '',
    'Revise the plan to address every item below, then present the updated plan for review.',
    '',
    `Plan revision: \`${revision}\``,
    '',
    ...sections.join('\n\n').split('\n'),
  ].join('\n').trim()
}

/** Fail closed on malformed or stale localStorage data. */
export function parseStoredDraft(value: string | null, revision: string): ReviewDraft | undefined {
  if (value === null) return undefined
  try {
    const parsed = JSON.parse(value) as Partial<ReviewDraft>
    if (parsed.revision !== revision || !Array.isArray(parsed.annotations)
      || typeof parsed.general !== 'string') return undefined
    const annotations: PlanAnnotation[] = []
    for (const item of parsed.annotations) {
      if (item === null || typeof item !== 'object') return undefined
      const candidate = item as Partial<PlanAnnotation>
      if (typeof candidate.id !== 'string'
        || typeof candidate.start !== 'number' || !Number.isSafeInteger(candidate.start)
        || typeof candidate.end !== 'number' || !Number.isSafeInteger(candidate.end)
        || candidate.start < 0 || candidate.end <= candidate.start
        || typeof candidate.quote !== 'string' || candidate.quote === ''
        || typeof candidate.prefix !== 'string' || typeof candidate.suffix !== 'string'
        || typeof candidate.comment !== 'string' || candidate.comment.trim() === ''
        || typeof candidate.createdAt !== 'number' || !Number.isSafeInteger(candidate.createdAt)) {
        return undefined
      }
      annotations.push(candidate as PlanAnnotation)
    }
    return { revision, annotations, general: parsed.general }
  } catch {
    return undefined
  }
}
