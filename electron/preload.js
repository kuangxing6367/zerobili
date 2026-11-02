/**
 * 内容视图 preload —— 等价于浏览器扩展的 content script 运行环境。
 *
 * contextIsolation: false 让这段代码和页面共享同一个 window，于是 MARGIN 拿到的
 * location / document / localStorage 和它作为扩展运行时完全一致；页面拿不到 Node，
 * 因为 nodeIntegration: false，这里的 require 只存在于 preload 模块作用域。
 *
 * 提供的东西：
 *   - chrome.storage.local      → IPC 落到 userData/margin-storage.json（异步、带 onChanged）
 *   - chrome.runtime.getURL     → margin://ext/...（主进程注册的自定义协议）
 *   - chrome.runtime.sendMessage→ 本页内消息总线，用来跑 MARGIN 的 background.js（足迹计时）
 */
const { ipcRenderer, webFrame } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const VENDOR = path.join(__dirname, '..', 'vendor', 'margin');

// ------------------------------------------------------------------ 消息总线
const msgListeners = [];
const changeListeners = [];

function sendMessage(msg, cb) {
  return new Promise((resolve) => {
    let settled = false;
    const respond = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
      if (typeof cb === 'function') {
        try {
          cb(v);
        } catch {
          /* ignore */
        }
      }
    };
    if (!msgListeners.length) return respond(undefined);
    let async = false;
    for (const fn of msgListeners.slice()) {
      try {
        if (fn(msg, { id: 'margin-desktop', url: location.href }, respond) === true) async = true;
      } catch (e) {
        console.error('[shim] onMessage listener 抛错', e);
      }
    }
    // 没有监听者声明异步回复时，按 chrome 的行为回 undefined
    if (!async) respond(undefined);
  });
}

// ------------------------------------------------------------------ chrome shim
let manifest = { name: 'MARGIN', version: '0.0.0', manifest_version: 3 };
try {
  manifest = JSON.parse(fs.readFileSync(path.join(VENDOR, 'manifest.json'), 'utf8'));
} catch {
  /* 用默认值 */
}

const storageLocal = {
  get: (keys) => ipcRenderer.invoke('chrome:storage-get', keys ?? null),
  set: (obj) => ipcRenderer.invoke('chrome:storage-set', obj),
  remove: (keys) => ipcRenderer.invoke('chrome:storage-remove', keys),
  clear: async () => {
    const all = await ipcRenderer.invoke('chrome:storage-get', null);
    return ipcRenderer.invoke('chrome:storage-remove', Object.keys(all));
  },
};

const shim = {
  storage: {
    local: storageLocal,
    // MARGIN 只用 local；sync 指向同一份，避免个别代码路径炸掉
    sync: storageLocal,
    onChanged: { addListener: (fn) => changeListeners.push(fn) },
  },
  runtime: {
    id: 'margin-desktop',
    getURL: (p) => `margin://ext/${String(p).replace(/^\/+/, '')}`,
    getManifest: () => manifest,
    getContexts: () => [],
    sendMessage,
    onMessage: { addListener: (fn) => msgListeners.push(fn) },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
  },
  i18n: {
    getMessage: (k) => {
      const m = manifest.__MSG?.[k];
      return m || k;
    },
  },
};

// Chromium 自带一个 window.chrome（loadTimes/csi 之类），保留它、把扩展 API 挂上去
if (typeof globalThis.chrome !== 'object' || globalThis.chrome === null) globalThis.chrome = {};
Object.assign(globalThis.chrome, shim);

// storage 变更从主进程推过来
ipcRenderer.on('chrome:storage-changed', (_e, changes, area) => {
  for (const fn of changeListeners.slice()) {
    try {
      fn(changes, area || 'local');
    } catch (e) {
      console.error('[shim] onChanged listener 抛错', e);
    }
  }
});

// ------------------------------------------------------------------ 注入 MARGIN
function readVendor(file) {
  try {
    return fs.readFileSync(path.join(VENDOR, file), 'utf8');
  } catch (e) {
    console.error('[shim] 读取失败', file, e);
    return null;
  }
}

function run(code, label) {
  if (!code) return;
  try {
    // 关键：不能在这里 eval / import。preload 是 Node 环境，动态 import() 会走
    // Node 的 ESM 加载器，遇到 data: / 自定义协议会把渲染进程直接搞崩。
    // 交给 webFrame 用 Blink 编译执行，import() 才走浏览器自己的模块加载器。
    webFrame
      .executeJavaScript(code, true)
      .then(() => console.log('[shim] 已注入', label))
      .catch((e) => console.error('[shim] 注入失败', label, String(e)));
  } catch (e) {
    console.error('[shim] 注入异常', label, e);
  }
}

/** 后台逻辑（足迹计时）也跑在这个页面里，消息总线直连 */
const bg = readVendor('background.js');
if (bg) run(bg, 'background.js');

// 播放页有一段要跑在主世界的 cdn 钩子（原 manifest 里 world: MAIN）
const MAIN_WORLD = /^\/(?:[a-z]{2}(?:-[A-Za-z]{2,4})?\/)?(?:video\/|bangumi\/play\/|list\/|festival\/|cheese\/play\/)/i;
if (location.hostname === 'www.bilibili.com' && MAIN_WORLD.test(location.pathname)) {
  run(readVendor('cdn.js'), 'cdn.js');
}

/**
 * content.js 假定 documentElement 已经存在（document_start 时 Chrome 保证成立）。
 * Electron 的 preload 更早，个别情况下还是 null，这里短暂等一下再执行。
 */
function injectContent() {
  const code = readVendor('content.js');
  if (!code) return;
  if (document.documentElement) {
    run(code, 'content.js');
    return;
  }
  const mo = new MutationObserver(() => {
    if (!document.documentElement) return;
    mo.disconnect();
    run(code, 'content.js');
  });
  mo.observe(document, { childList: true, subtree: true });
}

injectContent();




