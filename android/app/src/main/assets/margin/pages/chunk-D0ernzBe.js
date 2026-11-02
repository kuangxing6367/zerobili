import{D as e}from"./chunk-Si6j2P--.js";var t={"bili-comments-header-renderer":`
    #navbar { align-items: center !important; margin: 0 0 20px !important; padding-top: 0 !important; }
    #title { display: flex !important; align-items: baseline !important; gap: 8px !important; }
    #title h2 { margin: 0 !important; font: 400 24px/1.2 var(--m-serif, serif) !important; letter-spacing: .04em !important; color: var(--m-ink) !important; }
    #count { font: 400 13px/1 var(--m-mono, monospace) !important; color: var(--m-faint) !important; margin: 0 !important; }
    #sort-actions { display: inline-flex !important; align-items: center !important; gap: 2px !important; margin-left: 20px !important; padding: 3px !important; border-radius: 999px !important; background: var(--m-chip) !important; box-shadow: var(--ring) !important; }
    #sort-actions .sort-div { display: none !important; }
    #sort-actions bili-text-button { display: inline-flex; align-items: center; height: 28px; padding: 0 14px; border-radius: 999px; font-size: 13px; color: var(--m-muted); --bili-text-button-color: var(--m-muted); --bili-text-button-hover-color: var(--m-ink); cursor: pointer; transition: background .2s, color .2s, box-shadow .2s; }
    #sort-actions bili-text-button:hover { color: var(--m-ink); }
    #sort-actions.hot bili-text-button:first-of-type, #sort-actions:not(.hot) bili-text-button:last-of-type { background: var(--m-surface); color: var(--m-ink); --bili-text-button-color: var(--m-ink); box-shadow: var(--ring), var(--sh-xs); }
    #disabled-commentbox #edit { border: 0 !important; border-radius: 14px !important; background: var(--m-chip) !important; box-shadow: var(--ring) !important; color: var(--m-muted) !important; }
    #disabled-commentbox #edit button { border-radius: 999px !important; }
  `,"bili-comment-box":`
    #editor { background: var(--m-chip) !important; border: 0 !important; border-radius: 14px !important; box-shadow: var(--ring) !important; padding: 10px 14px !important; transition: box-shadow .2s, background .2s !important; }
    #editor:hover { background: color-mix(in srgb, var(--m-ink) 7%, transparent) !important; }
    #editor:focus-within, #editor.active { background: var(--m-surface) !important; box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--m-accent) 55%, transparent), var(--sh-xs) !important; }
    #footer .tool-btn { border-radius: 8px !important; }
    #pub button { border-radius: 999px !important; padding: 0 18px !important; }
  `,"bili-comment-rich-textarea":`
    #input, .brt-root, .brt-editor { background: transparent !important; color: var(--m-ink) !important; font-size: 14px !important; line-height: 1.6 !important; }
    .brt-placeholder, [data-placeholder]::before { color: var(--m-faint) !important; }
  `},n=/* @__PURE__ */ new WeakSet,r={},i=/* @__PURE__ */ new Map;function a(e,o=0){if(!(o>6))for(let s of e.querySelectorAll(`*`)){let e=s.shadowRoot;if(!e)continue;let c=s.tagName.toLowerCase(),l=t[c]?t[c]+(r[c]??``):void 0;if(l&&!n.has(e)){let t=i.get(c);t||(t=new CSSStyleSheet,t.replaceSync(l),i.set(c,t)),e.adoptedStyleSheets=[...e.adoptedStyleSheets,t],n.add(e)}(c===`bili-comments`||c===`bili-comments-header-renderer`||c===`bili-comment-box`)&&a(e,o+1)}}function o(t={}){r=t;let n=()=>{let e=document.querySelector(`bili-comments`);e&&a(e.parentElement??document)},i=0,o=e(1e3,()=>{n(),++i>90&&o()}),s=0;addEventListener(`scroll`,()=>{s||=window.setTimeout(()=>{s=0,n()},400)},{passive:!0})}export{o as t};