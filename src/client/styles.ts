const STYLE_ID = 'dsh-plannotator-styles'

const CSS_TEXT = String.raw`
.dsh-plannotator-frame{display:flex;justify-content:center;padding:6px calc(var(--dsh-composer-side-clearance,16px) + 8px) 10px;color:var(--dsw-alias-label-primary,#20242c)}
.dsh-plannotator-card,.dsh-plannotator-card *{box-sizing:border-box}
.dsh-plannotator-card{display:flex;overflow:hidden;flex-direction:column;width:min(1120px,100%);height:min(72vh,680px);min-height:460px;border:1px solid var(--dsw-alias-state-warn-secondary,#e2b849);border-radius:20px;background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-shadow-lv2,0 12px 40px rgba(0,0,0,.14))}
.dsh-plannotator-strip{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;background:var(--dsw-alias-state-warn-tertiary,#fff6d8);color:var(--dsw-alias-state-warn-primary,#8d6200);font-size:13px;line-height:20px}
.dsh-plannotator-brand{display:flex;align-items:center;gap:8px;font-weight:650}.dsh-plannotator-dot{width:8px;height:8px;border-radius:50%;background:currentColor}.dsh-plannotator-count{font-variant-numeric:tabular-nums;opacity:.78}
.dsh-plannotator-workspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;flex:1;min-height:0}
.dsh-plannotator-document{position:relative;min-width:0;overflow:auto;padding:24px 32px 64px;overscroll-behavior:contain;scrollbar-gutter:stable;border-right:1px solid var(--dsw-alias-border-l,#e4e7ee);font-size:14px;line-height:1.65}
.dsh-plannotator-document ::selection{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a500) 28%,transparent)}
::highlight(dsh-plannotator-annotations){background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a500) 28%,transparent);text-decoration:underline;text-decoration-color:var(--dsw-alias-state-warn-primary,#b27a00);text-decoration-thickness:2px;text-underline-offset:3px}
.dsh-plannotator-selection-action{position:fixed;z-index:1000;transform:translateY(8px);padding:6px 10px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#cfd4df);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#20242c);box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.2));color:var(--dsw-alias-label-on-primary,#fff);font:600 12px/18px var(--dsw-font-family,system-ui);cursor:pointer}
.dsh-plannotator-rail{min-width:0;overflow:auto;padding:14px;background:var(--dsw-alias-bg-layer-1,#f7f8fa);overscroll-behavior:contain}
.dsh-plannotator-rail-title{display:flex;align-items:center;justify-content:space-between;margin:2px 2px 10px;font-size:12px;font-weight:650;color:var(--dsw-alias-label-secondary,#596273)}
.dsh-plannotator-empty{padding:32px 14px;border:1px dashed var(--dsw-alias-border-l,#d8dde7);border-radius:12px;color:var(--dsw-alias-label-dimmed,#8991a2);font-size:12px;line-height:1.6;text-align:center}
.dsh-plannotator-annotation,.dsh-plannotator-new,.dsh-plannotator-general{margin-bottom:10px;padding:11px;border:1px solid var(--dsw-alias-border-l,#dfe3ea);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fff)}
.dsh-plannotator-new{border-color:var(--dsw-alias-state-warn-secondary,#e2b849);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a500) 10%,transparent)}
.dsh-plannotator-quote{display:-webkit-box;overflow:hidden;margin-bottom:8px;color:var(--dsw-alias-label-secondary,#596273);font:12px/18px ui-monospace,SFMono-Regular,Menlo,monospace;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.dsh-plannotator-quote:before{content:'“';color:var(--dsw-alias-state-warn-primary,#9a6a00)}.dsh-plannotator-quote:after{content:'”';color:var(--dsw-alias-state-warn-primary,#9a6a00)}
.dsh-plannotator-comment{white-space:pre-wrap;color:var(--dsw-alias-label-primary,#20242c);font-size:12px;line-height:18px}
.dsh-plannotator-annotation-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;color:var(--dsw-alias-label-dimmed,#8991a2);font-size:11px}
.dsh-plannotator-icon-button{padding:2px 6px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-dimmed,#8991a2);cursor:pointer}.dsh-plannotator-icon-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-state-error-primary,#cc3d4a)}
.dsh-plannotator-textarea{display:block;width:100%;min-height:78px;resize:vertical;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#cfd4df);border-radius:9px;outline:none;background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#20242c);font:12px/18px var(--dsw-font-family,system-ui)}.dsh-plannotator-textarea:focus{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,transparent)}
.dsh-plannotator-mini-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}
.dsh-plannotator-button{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:5px 11px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#cfd4df);border-radius:9px;background:transparent;color:var(--dsw-alias-label-primary,#20242c);font:600 12px/18px var(--dsw-font-family,system-ui);cursor:pointer}.dsh-plannotator-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}.dsh-plannotator-button:disabled{cursor:not-allowed;opacity:.48}.dsh-plannotator-button-primary{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:var(--dsw-alias-state-business-primary,#4d6bfe);color:white}.dsh-plannotator-button-warn{border-color:var(--dsw-alias-state-warn-primary,#b07a00);background:var(--dsw-alias-state-warn-primary,#b07a00);color:white}
.dsh-plannotator-footer{display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:12px;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l,#e4e7ee);background:var(--dsw-specific-input-major,#fff)}
.dsh-plannotator-status{min-width:0;color:var(--dsw-alias-state-error-primary,#cc3d4a);font-size:11px;line-height:16px}.dsh-plannotator-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px}.dsh-plannotator-confirm{color:var(--dsw-alias-state-warn-primary,#9a6a00);font-size:11px}
@media(max-width:760px){.dsh-plannotator-frame{padding:4px 8px 8px}.dsh-plannotator-card{height:min(78vh,700px);min-height:430px;border-radius:16px}.dsh-plannotator-workspace{display:flex;overflow:auto;flex-direction:column}.dsh-plannotator-document{overflow:visible;padding:18px 16px 36px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l,#e4e7ee)}.dsh-plannotator-rail{overflow:visible}.dsh-plannotator-footer{align-items:flex-start;flex-direction:column}.dsh-plannotator-actions{width:100%;justify-content:flex-end}}
`

/** Install the plugin's namespaced CSS and return an unload disposer. */
export function installStyles(): () => void {
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => undefined
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS_TEXT
  document.head.append(style)
  return () => { style.remove() }
}
