const STYLE_ID = 'dsh-plannotator-styles'
const STYLE_OWNERS = 'data-dsh-plannotator-style-owners'

const CSS_TEXT = String.raw`
.dsh-plannotator-launcher,.dsh-plannotator-panel,.dsh-plannotator-panel *,.dsh-plannotator-rail-button{box-sizing:border-box}
.dsh-plannotator-launcher{display:flex;align-items:center;gap:11px;margin:6px calc(var(--dsh-composer-side-clearance,16px) + 16px) 10px;padding:9px 10px 9px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 38%,var(--dsw-alias-border-l2,#d9dce3));border-radius:16px;background:color-mix(in srgb,var(--dsw-alias-state-business-tertiary,#edf3ff) 72%,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#20242c);box-shadow:var(--dsw-shadow-lv1,0 3px 12px rgba(30,64,175,.08))}
.dsh-plannotator-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 12%,transparent)}
.dsh-plannotator-launcher-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:1px}.dsh-plannotator-launcher-copy strong{font-size:13px;line-height:18px}.dsh-plannotator-launcher-copy span{overflow:hidden;color:var(--dsw-alias-label-secondary,#596273);font-size:11px;line-height:16px;text-overflow:ellipsis;white-space:nowrap}
.dsh-plannotator-blue-button{display:inline-flex;min-height:28px;align-items:center;justify-content:center;padding:4px 11px;border:1px solid var(--dsw-alias-button-info-fill,var(--dsw-alias-state-business-primary,#4d6bfe));border-radius:14px;background:var(--dsw-alias-button-info-fill,var(--dsw-alias-state-business-primary,#4d6bfe));color:var(--dsw-alias-label-primary-foreground,#fff);font:600 12px/18px var(--dsw-font-family,system-ui);cursor:pointer}.dsh-plannotator-blue-button:hover:not(:disabled){background:var(--dsw-alias-button-info-hover,#3e5dde);border-color:var(--dsw-alias-button-info-hover,#3e5dde)}.dsh-plannotator-blue-button:disabled{cursor:not-allowed;opacity:.4}
.dsh-plannotator-panel{position:fixed;z-index:80;top:56px;right:8px;bottom:12px;display:flex;min-width:0;overflow:hidden;flex-direction:column;width:min(420px,calc(100vw - 72px));border:1px solid var(--dsw-alias-border-l2,#d9dce3);border-radius:18px;background:var(--dsw-alias-bg-base,#fff);box-shadow:var(--dsw-shadow-lv2,0 16px 48px rgba(17,24,39,.16));color:var(--dsw-alias-label-primary,#20242c);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);animation:dsh-plannotator-in var(--ds-transition-duration-slow,180ms) var(--ds-ease-in-out,ease)}
@keyframes dsh-plannotator-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
.dsh-plannotator-panel-header{display:flex;min-height:54px;flex:none;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 16px;border-bottom:1px solid var(--dsw-alias-border-l2,#d9dce3);background:color-mix(in srgb,var(--dsw-alias-state-business-tertiary,#edf3ff) 66%,var(--dsw-alias-bg-base,#fff))}
.dsh-plannotator-panel-heading{display:flex;min-width:0;align-items:center;gap:11px}.dsh-plannotator-panel-heading>div{display:flex;min-width:0;flex-direction:column}.dsh-plannotator-panel-heading h2{overflow:hidden;margin:0;border-radius:5px;font-size:14px;font-weight:600;line-height:20px;text-overflow:ellipsis;white-space:nowrap}.dsh-plannotator-panel-heading h2:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:2px}.dsh-plannotator-panel-heading span:last-child{color:var(--dsw-alias-label-secondary,#596273);font-size:11px;line-height:15px}
.dsh-plannotator-collapse{display:inline-flex;width:30px;height:30px;flex:none;align-items:center;justify-content:center;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary,#596273);cursor:pointer}.dsh-plannotator-collapse:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsh-plannotator-workspace{display:flex;min-height:0;flex:1;flex-direction:column;background:var(--dsw-alias-bg-base,#fff)}
.dsh-plannotator-document{position:relative;min-width:0;min-height:200px;flex:1 1 58%;overflow:auto;padding:18px 20px 32px;overflow-wrap:anywhere;overscroll-behavior:contain;scrollbar-gutter:stable;font-size:13px;line-height:1.62}.dsh-plannotator-document pre{overflow-x:auto}.dsh-plannotator-document code{overflow-wrap:normal}
.dsh-plannotator-document ::selection{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 22%,transparent)}
::highlight(dsh-plannotator-annotations){background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 18%,transparent);text-decoration:underline;text-decoration-color:var(--dsw-alias-state-business-primary,#4d6bfe);text-decoration-thickness:2px;text-underline-offset:3px}
.dsh-plannotator-selection-action{position:fixed;z-index:90;transform:translateY(8px);padding:6px 10px;border:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);border-radius:9px;background:var(--dsw-alias-button-info-fill,var(--dsw-alias-state-business-primary,#4d6bfe));box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.18));color:var(--dsw-alias-label-primary-foreground,#fff);font:600 12px/18px var(--dsw-font-family,system-ui);cursor:pointer}
.dsh-plannotator-review{min-width:0;min-height:148px;max-height:44%;flex:0 1 auto;overflow:auto;padding:12px;border-top:1px solid var(--dsw-alias-border-l2,#d9dce3);background:var(--dsw-alias-bg-layer-1,#f7f8fa);overflow-wrap:anywhere;overscroll-behavior:contain}
.dsh-plannotator-review-title{display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px;color:var(--dsw-alias-label-secondary,#596273);font-size:11px;font-weight:650}.dsh-plannotator-review-title span:last-child{color:var(--dsw-alias-label-tertiary,#8991a2);font-weight:400}
.dsh-plannotator-empty{padding:20px 12px;border:1px dashed var(--dsw-alias-border-l2,#d9dce3);border-radius:12px;color:var(--dsw-alias-label-tertiary,#8991a2);font-size:11px;line-height:1.55;text-align:center}
.dsh-plannotator-annotation,.dsh-plannotator-new,.dsh-plannotator-general{margin-bottom:9px;padding:10px;border:1px solid var(--dsw-alias-border-l2,#d9dce3);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fff)}
.dsh-plannotator-new{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%,transparent)}
.dsh-plannotator-general{margin-top:9px;margin-bottom:0}.dsh-plannotator-quote{display:-webkit-box;overflow:hidden;margin:0 0 7px;color:var(--dsw-alias-label-secondary,#596273);font:11px/17px ui-monospace,SFMono-Regular,Menlo,monospace;text-align:left;-webkit-line-clamp:3;-webkit-box-orient:vertical}.dsh-plannotator-quote:before{content:'“';color:var(--dsw-alias-state-business-primary,#4d6bfe)}.dsh-plannotator-quote:after{content:'”';color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsh-plannotator-comment{white-space:pre-wrap;font-size:12px;line-height:18px}.dsh-plannotator-annotation-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;color:var(--dsw-alias-label-tertiary,#8991a2);font-size:11px}
.dsh-plannotator-icon-button{padding:2px 5px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#8991a2);cursor:pointer}.dsh-plannotator-icon-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsh-plannotator-textarea{display:block;width:100%;min-height:72px;resize:vertical;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2,#cfd4df);border-radius:9px;outline:none;background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#20242c);font:12px/18px var(--dsw-font-family,system-ui)}.dsh-plannotator-textarea:focus{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,transparent)}
.dsh-plannotator-mini-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:7px}
.dsh-plannotator-footer{display:flex;flex:none;flex-direction:column;gap:7px;padding:9px 10px 10px;border-top:1px solid var(--dsw-alias-border-l2,#d9dce3);background:var(--dsw-alias-bg-base,#fff)}.dsh-plannotator-status{min-height:16px;color:var(--dsw-alias-state-error-primary,#cc3d4a);font-size:11px;line-height:16px}.dsh-plannotator-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px}.dsh-plannotator-actions>button{white-space:nowrap}
.dsh-plannotator-danger-button{border-color:var(--dsw-alias-state-error-primary,#cc3d4a)!important;background:var(--dsw-alias-state-error-primary,#cc3d4a)!important;color:var(--dsw-alias-label-primary-foreground,#fff)!important}
.dsh-plannotator-rail-button{position:fixed;z-index:79;top:50%;right:0;display:flex;width:44px;min-height:138px;align-items:center;justify-content:center;gap:8px;padding:10px 8px;border:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);border-right:0;border-radius:15px 0 0 15px;background:var(--dsw-alias-state-business-tertiary,#edf3ff);box-shadow:var(--dsw-shadow-lv1,0 6px 20px rgba(30,64,175,.12));color:var(--dsw-alias-state-business-primary,#4d6bfe);cursor:pointer;transform:translateY(-50%);writing-mode:vertical-rl}.dsh-plannotator-rail-button:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,var(--dsw-alias-bg-base,#fff))}.dsh-plannotator-rail-button span{font-size:12px;font-weight:650;letter-spacing:.04em}.dsh-plannotator-rail-button strong{display:inline-flex;min-width:19px;height:19px;align-items:center;justify-content:center;border-radius:10px;background:var(--dsw-alias-state-business-primary,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff);font-size:10px;writing-mode:horizontal-tb}
.dsh-plannotator-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;clip-path:inset(50%)!important}
.dsh-plannotator-panel button:focus-visible,.dsh-plannotator-launcher button:focus-visible,.dsh-plannotator-rail-button:focus-visible,.dsh-plannotator-selection-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:2px}
@media(min-width:1480px){body:has(>.dsh-plannotator-panel[data-panel-mode='docked'])>#root{width:calc(100% - clamp(440px,28vw,560px))}body:has(>.dsh-plannotator-rail-button[data-panel-mode='docked'])>#root{width:calc(100% - 44px)}.dsh-plannotator-panel[data-panel-mode='docked']{top:0;right:0;bottom:0;width:clamp(440px,28vw,560px);max-width:none;border-width:0 0 0 1px;border-radius:0;box-shadow:none;animation:none}.dsh-plannotator-rail-button[data-panel-mode='docked']{top:0;right:0;bottom:0;width:44px;min-height:0;border-width:0 0 0 1px;border-radius:0;box-shadow:none;transform:none}}
@media(max-width:1479px){.dsh-plannotator-launcher-copy span{display:none}.dsh-plannotator-rail-button{display:none}}
@media(max-width:640px){.dsh-plannotator-launcher{margin-right:8px;margin-left:8px}.dsh-plannotator-panel{top:auto;right:8px;bottom:8px;left:8px;width:auto;height:min(68dvh,620px);border-radius:18px}.dsh-plannotator-document{min-height:160px;padding:16px 16px 24px}.dsh-plannotator-review{max-height:46%}.dsh-plannotator-actions{display:grid;grid-template-columns:1fr 1fr}.dsh-plannotator-actions>button:first-child{grid-column:1/-1}.dsh-plannotator-rail-button{bottom:90px;top:auto;min-height:120px;transform:none}}
@media(prefers-reduced-motion:reduce){.dsh-plannotator-panel{animation:none}.dsh-plannotator-document *{scroll-behavior:auto!important}}
`

/** Install the plugin's namespaced CSS and return an unload disposer. */
export function installStyles(): () => void {
  let style = document.getElementById(STYLE_ID)
  // A pre-refcount client can still own the existing node and remove it when
  // its old fiber unloads. Detach that legacy node and create one owned only
  // by refcount-aware clients, so the stale disposer cannot delete our CSS.
  if (style !== null && !style.hasAttribute(STYLE_OWNERS)) {
    style.remove()
    style = null
  }
  if (style === null) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.append(style)
  }
  // The newest HMR bundle owns the current CSS text even while it overlaps
  // an older refcount-aware fiber using the same node.
  if (style.textContent !== CSS_TEXT) style.textContent = CSS_TEXT
  const owners = Number.parseInt(style.getAttribute(STYLE_OWNERS) ?? '0', 10)
  style.setAttribute(STYLE_OWNERS, String(Number.isSafeInteger(owners) ? owners + 1 : 1))
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    const current = Number.parseInt(style.getAttribute(STYLE_OWNERS) ?? '1', 10)
    if (current <= 1) style.remove()
    else style.setAttribute(STYLE_OWNERS, String(current - 1))
  }
}
