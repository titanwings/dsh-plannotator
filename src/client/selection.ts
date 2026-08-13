import type { PlanAnnotation } from './feedback.js'

export interface SelectionAnchor extends Omit<PlanAnnotation, 'id' | 'comment' | 'createdAt'> {
  readonly rect: { readonly left: number; readonly bottom: number }
}

function anchorFromRange(root: HTMLElement, range: Range): SelectionAnchor | undefined {
  const before = document.createRange()
  before.selectNodeContents(root)
  before.setEnd(range.startContainer, range.startOffset)
  const raw = range.toString()
  const leading = raw.length - raw.trimStart().length
  const quote = raw.trim()
  if (quote === '' || quote.length > 800) return undefined
  const start = before.toString().length + leading
  const end = start + quote.length
  const fullText = root.textContent ?? ''
  const rect = range.getBoundingClientRect()
  return {
    start,
    end,
    quote,
    prefix: fullText.slice(Math.max(0, start - 48), start),
    suffix: fullText.slice(end, end + 48),
    rect: { left: rect.left, bottom: rect.bottom },
  }
}

/** Convert the current browser selection to a text-context anchor within root. */
export function selectionAnchor(root: HTMLElement): SelectionAnchor | undefined {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount !== 1 || selection.isCollapsed) return undefined
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return undefined
  return anchorFromRange(root, range)
}

/** Use one rendered Markdown block as a coarse, mouse-friendly anchor. */
export function elementAnchor(root: HTMLElement, element: HTMLElement): SelectionAnchor | undefined {
  if (element === root || !root.contains(element)) return undefined
  const range = document.createRange()
  range.selectNodeContents(element)
  return anchorFromRange(root, range)
}

/** Resolve a visible-text offset pair back to a DOM Range. */
export function rangeForAnchor(root: HTMLElement, start: number, end: number): Range | undefined {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let startNode: Text | undefined
  let startOffset = 0
  let endNode: Text | undefined
  let endOffset = 0
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node as Text
    const next = offset + text.data.length
    if (startNode === undefined && start >= offset && start <= next) {
      startNode = text
      startOffset = start - offset
    }
    if (end >= offset && end <= next) {
      endNode = text
      endOffset = end - offset
      break
    }
    offset = next
  }
  if (startNode === undefined || endNode === undefined) return undefined
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return range
}

/** Render non-destructive inline highlights through Chromium's Highlight API. */
export function applyAnnotationHighlights(
  root: HTMLElement,
  annotations: readonly PlanAnnotation[],
): () => void {
  const highlights = CSS.highlights
  if (highlights === undefined || typeof Highlight === 'undefined') return () => undefined
  const ranges = annotations.flatMap(annotation => {
    const range = rangeForAnchor(root, annotation.start, annotation.end)
    if (range === undefined || range.toString().trim() !== annotation.quote.trim()) return []
    return [range]
  })
  const key = 'dsh-plannotator-annotations'
  if (ranges.length > 0) highlights.set(key, new Highlight(...ranges))
  else highlights.delete(key)
  return () => { highlights.delete(key) }
}
