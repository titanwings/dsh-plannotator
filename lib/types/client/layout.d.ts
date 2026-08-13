export type PanelMode = 'docked' | 'drawer' | 'sheet';
export declare const SHEET_MAX_WIDTH = 640;
export declare const DOCKED_MIN_WIDTH = 1480;
export declare const COLLAPSED_DOCK_WIDTH = 44;
/** Keep the runtime mode boundary identical to the CSS media queries. */
export declare function panelModeForWidth(width: number): PanelMode;
/** Mirror CSS clamp(440px, 28vw, 560px) for geometry assertions. */
export declare function dockedSidebarWidth(viewportWidth: number, collapsed: boolean): number;
