export type PanelMode = 'docked' | 'drawer' | 'sheet'

export const SHEET_MAX_WIDTH = 640
export const DOCKED_MIN_WIDTH = 1480
export const COLLAPSED_DOCK_WIDTH = 44

/** Keep the runtime mode boundary identical to the CSS media queries. */
export function panelModeForWidth(width: number): PanelMode {
  if (width <= SHEET_MAX_WIDTH) return 'sheet'
  if (width >= DOCKED_MIN_WIDTH) return 'docked'
  return 'drawer'
}

/** Mirror CSS clamp(440px, 28vw, 560px) for geometry assertions. */
export function dockedSidebarWidth(viewportWidth: number, collapsed: boolean): number {
  if (collapsed) return COLLAPSED_DOCK_WIDTH
  return Math.min(560, Math.max(440, viewportWidth * 0.28))
}
