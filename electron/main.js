/**
 * 映间 MARGIN 桌面壳 —— 主进程
 *
 * 设计要点：
 * 1. 内容区加载真实的 https://www.bilibili.com，MARGIN 的路由判断（location.hostname）
 *    因此原样成立，播放器 / 登录 / 弹幕全部走 B 站原生能力。
 * 2. MARGIN 是扩展，靠 chrome.* 运行。这里用 preload 提供一套最小 shim，
 *    把 storage 落到本地 JSON，把扩展资源挂到 margin:// 自定义协议。
 * 3. 多窗口：每个被打开的页面都是一个独立的 BrowserWindow（自带标题栏 + 内容视图），
 *    共享 persist:bili 分区（登录态互通）。window.open 不再被吞掉。
 * 4. 内存：单窗口复用、后台节流、首次启动关掉 shader 背景与开场动画。
 */
const { app, BrowserWindow, WebContentsView, protocol, session, ipcMain, shell, Menu, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

// 用户数据目录固定下来：登录态、MARGIN 设置、足迹全在这里。
// 不固定的话它跟着 package.json 的 name 走，哪天改名就会“登录凭空消失”。
const USER_DATA = path.join(app.getPath('appData'), 'zerobili');
// 0.1.0 之前目录叫 bili-margin-client，改名前装过的用户直接搬过来，别让人重新登录一次
const LEGACY_DATA = path.join(app.getPath('appData'), 'bili-margin-client');
try {
  if (!fs.existsSync(USER_DATA) && fs.existsSync(LEGACY_DATA)) {
    fs.cpSync(LEGACY_DATA, USER_DATA, { recursive: true });
  }
} catch (e) {
  console.error('迁移旧用户数据失败', e);
}
app.setPath('userData', USER_DATA);

const VENDOR = path.join(__dirname, '..', 'vendor', 'margin');
const IS_DEV = process.argv.includes('--dev');
const BILI_HOME = process.env.MARGIN_START_URL || 'https://www.bilibili.com/';

// Windows 下 Electron 的 stdout 有时拿不到，自检信息同时写文件。
// 打包后 __dirname 在只读的 app.asar 里，不能往回写，所以落到临时目录。
const os = require('node:os');
const OUT_DIR = app.isPackaged ? path.join(os.tmpdir(), 'margin-client') : path.join(__dirname, '..');
try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch {
  /* ignore */
}
const LOG_FILE = path.join(OUT_DIR, 'debug.log');
const log = (...args) => {
  const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {
    /* ignore */
  }
};

// 内容视图的会话分区（持久化登录态，所有窗口共用）
const PARTITION = 'persist:bili';

// ---------------------------------------------------------------- 内存相关开关
// 必须在 app ready 之前设置。原则：只砍和渲染无关的开销，不动 GPU 与视频解码。
// MARGIN_PROFILE 用于对照实验，不设则用 lean（默认）。
const PROFILE = process.env.MARGIN_PROFILE || 'lean';

// 关闭 Electron 默认的开发者工具扩展宿主，省一个常驻进程
app.commandLine.appendSwitch('disable-extensions');

// Chromium 里这些服务在本客户端中用不到，关掉省 CPU 与后台网络唤醒
const DEAD_FEATURES = [
  'CalculateNativeWinOcclusion',
  'MediaRouter',
  'Translate',
  'TranslateUI',
  'AutofillServerCommunication',
  'OptimizationHints',
  'OptimizationGuideModelDownloading',
  'InterestFeedContentSuggestions',
  'SpareRendererForSitePerProcess', // 预启动的备用渲染进程，白吃内存
  'BackForwardCache', // 前进后退缓存会把整页留在内存里
  'Prerender2',
  'SpeculationRulesPrefetch',
];

if (PROFILE === 'base') {
  // 实验组 A：和改造前一致的最小开关
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,MediaRouter');
} else {
  app.commandLine.appendSwitch('disable-features', DEAD_FEATURES.join(','));
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  app.commandLine.appendSwitch('disable-background-networking');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('no-pings');
  app.commandLine.appendSwitch('metrics-recording-only');

  if (PROFILE === 'lean') {
    // 实验组 B：把 GPU 进程并进主进程（少一个进程组，但稳定性/性能待验证）
  } else if (PROFILE === 'nogpu') {
    // 实验组 C：完全关掉 GPU 加速（视频走软件解码，播放会重）
    app.disableHardwareAcceleration();
  } else if (PROFILE === 'inproc') {
    // 实验组 D：GPU 与渲染同进程（Chromium 官方不保证支持）
    app.commandLine.appendSwitch('in-process-gpu');
  }
}

app.commandLine.appendSwitch('disable-background-timer-throttling', 'false');

// 多窗口登记：保存所有 BrowserWindow 实例，便于广播与回收
const windows = new Set();

const TITLEBAR_HEIGHT = 40;

let memTimer = null;

// ---------------------------------------------------------------- 存储（模拟 chrome.storage.local）
// 单文件 JSON，主进程持有，所有渲染进程通过 IPC 读写，写入防抖落盘。
const STORE_FILE = () => path.join(app.getPath('userData'), 'margin-storage.json');
let store = {};
let saveTimer = null;

function loadStore() {
  try {
    store = JSON.parse(fs.readFileSync(STORE_FILE(), 'utf8'));
  } catch {
    store = {};
  }
}
function persistSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fsp.writeFile(STORE_FILE(), JSON.stringify(store), 'utf8').catch((e) => {
      console.error('[store] 写入失败', e);
    });
  }, 300);
}

/** 按 chrome.storage 的 keys 语义取值 */
function pick(keys) {
  if (keys === null || keys === undefined) return { ...store };
  if (typeof keys === 'string') return keys in store ? { [keys]: store[keys] } : {};
  if (Array.isArray(keys)) {
    const out = {};
    for (const k of keys) if (k in store) out[k] = store[k];
    return out;
  }
  if (typeof keys === 'object') {
    const out = {};
    for (const [k, def] of Object.entries(keys)) out[k] = k in store ? store[k] : def;
    return out;
  }
  return {};
}

function broadcast(changes) {
  if (!Object.keys(changes).length) return;
  for (const w of windows) {
    if (w.isDestroyed()) continue;
    if (!w.webContents.isDestroyed()) w.webContents.send('chrome:storage-changed', changes, 'local');
    const v = w.zbView;
    if (v && !v.webContents.isDestroyed()) v.webContents.send('chrome:storage-changed', changes, 'local');
  }
}

ipcMain.handle('chrome:storage-get', (_e, keys) => pick(keys));

ipcMain.handle('chrome:storage-set', (_e, obj) => {
  const changes = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const oldValue = store[k];
    store[k] = v;
    changes[k] = { oldValue, newValue: v };
  }
  persistSoon();
  broadcast(changes);
});

ipcMain.handle('chrome:storage-remove', (_e, keys) => {
  const list = Array.isArray(keys) ? keys : [keys];
  const changes = {};
  for (const k of list) {
    if (!(k in store)) continue;
    changes[k] = { oldValue: store[k] };
    delete store[k];
  }
  persistSoon();
  broadcast(changes);
});

ipcMain.handle('chrome:manifest', () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(VENDOR, 'manifest.json'), 'utf8'));
  } catch {
    return { version: '0.0.0', name: 'MARGIN' };
  }
});

// ---------------------------------------------------------------- margin:// 协议
// 扩展里的 chrome.runtime.getURL('pages/home.js') 会映射到这里，
// 动态 import 需要标准协议 + CORS + 正确的 MIME。
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'margin',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

function registerMarginProtocol(ses) {
  ses.protocol.handle('margin', async (req) => {
    try {
      const u = new URL(req.url);
      // margin://ext/pages/home.js -> pages/home.js
      const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
      const target = path.join(VENDOR, rel);
      // 防目录穿越
      if (!target.startsWith(VENDOR)) return new Response('forbidden', { status: 403 });
      // 交给 Electron 自己的网络栈读文件：MIME、范围请求、流式响应都由它处理，
      // 比自己构造 Response 更接近真实文件服务（自己构造会让 ESM 加载崩掉渲染进程）
      const fileRes = await net.fetch(pathToFileURL(target).toString());
      const ext = path.extname(target).toLowerCase();
      return new Response(fileRes.body, {
        status: fileRes.status,
        headers: {
          // 自己按扩展名判定，net.fetch(file://) 对 .js 未必给 text/javascript
          'content-type': MIME[ext] || fileRes.headers.get('content-type') || 'application/octet-stream',
          'access-control-allow-origin': '*',
          'cache-control': 'no-cache',
        },
      });
    } catch {
      return new Response('not found', { status: 404 });
    }
  });
}

// ---------------------------------------------------------------- 省内存预设
/**
 * MARGIN 默认 bg.mode = 'random' + intro = true：首页会跑 WebGPU/WebGL shader 背景和开场动画，
 * 这是桌面壳里最不划算的开销。首次运行时写一份更克制的默认值，用户之后在 B 站页内设置里
 * 仍然可以自己开回来（页内设置写的是同一份 storage，会覆盖这里）。
 */
const SETTINGS_KEY = 'margin:settings';
const ZB_KEY = 'zb'; // zerobili 壳自身设置：restoreLast / privacy / lastUrl
const LEAN_DEFAULTS = {
  bg: { mode: 'off', shader: 'aurora', intensity: 0.6 },
  intro: false,
  hoverPreview: false,
};

function seedLeanDefaults() {
  if (SETTINGS_KEY in store) return;
  store[SETTINGS_KEY] = { ...LEAN_DEFAULTS };
  persistSoon();
  console.log('[memory] 已写入省内存默认值（背景 off / 关闭开场动画 / 关闭悬停预览）');
}

/** 客户端「省内存」开关：开 = 关背景+动画+悬停预览；关 = 交还给页内设置 */
ipcMain.handle('app:set-lean', (_e, on) => {
  const cur = store[SETTINGS_KEY] || {};
  const next = on
    ? { ...cur, ...LEAN_DEFAULTS, bg: { ...(cur.bg || {}), mode: 'off' } }
    : { ...cur, bg: { ...(cur.bg || {}), mode: 'random' }, intro: true, hoverPreview: true };
  const oldValue = store[SETTINGS_KEY];
  store[SETTINGS_KEY] = next;
  persistSoon();
  broadcast({ [SETTINGS_KEY]: { oldValue, newValue: next } });
  // 页内模块收到 onChanged 会自己更新；背景类改动需要重载才彻底释放
  for (const w of windows) {
    const v = w.zbView;
    if (v && !v.webContents.isDestroyed()) v.webContents.reload();
  }
  return true;
});

ipcMain.handle('app:get-lean', () => {
  const s = store[SETTINGS_KEY] || {};
  return (s.bg?.mode ?? 'random') === 'off';
});

// ---------------------------------------------------------------- 内存统计
function memorySnapshot() {
  try {
    const metrics = app.getAppMetrics();
    let total = 0;
    const byType = {};
    for (const m of metrics) {
      const mb = (m.memory?.workingSetSize ?? 0) / 1024;
      total += mb;
      byType[m.type] = (byType[m.type] || 0) + mb;
    }
    return { totalMB: Math.round(total), byType, processes: metrics.length };
  } catch {
    return { totalMB: 0, byType: {}, processes: 0 };
  }
}

ipcMain.handle('app:memory', () => memorySnapshot());

// zerobili 壳自身设置（与 MARGIN 的 margin:settings 分开存）
ipcMain.handle('app:get-setting', (_e, key) => (store[ZB_KEY] || {})[key]);
ipcMain.handle('app:set-setting', (_e, key, val) => {
  const cfg = store[ZB_KEY] || {};
  cfg[key] = val;
  store[ZB_KEY] = cfg;
  persistSoon();
  return true;
});
ipcMain.handle('app:clear-auth', async () => {
  // 清理登录态：分区内的 cookie / 本地存储全清，重启后回到未登录
  const ses = session.fromPartition(PARTITION);
  await ses.clearStorageData({
    storages: ['cookies', 'local_storage', 'session_storage', 'indexed_db'],
  });
  return true;
});

/** 由壳页面请求：再开一个独立窗口（新窗口按钮） */
ipcMain.on('app:new-window', () => createWindow(BILI_HOME));

// ---------------------------------------------------------------- 窗口
/**
 * 每个窗口 = 一个 BrowserWindow（标题栏壳） + 一个 WebContentsView（B 站内容）。
 * 窗口实例上挂 zbView / zbTitleExtra 两个字段，IPC 处理时通过 event.sender 反查所属窗口。
 */
function windowOf(sender) {
  return BrowserWindow.fromWebContents(sender);
}

function createWindow(startUrlOverride) {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    show: false,
    backgroundColor: '#0e0f11',
    title: 'zerobili',
    webPreferences: {
      preload: path.join(__dirname, 'shell-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.zbTitleExtra = 0;
  windows.add(win);

  const shellFile = path.join(__dirname, '..', 'shell', 'index.html');
  if (!fs.existsSync(shellFile)) {
    // 打包漏文件时这里会静默失败：窗口只剩一层底色，没有标题栏也没有关闭按钮
    log('[shell] 致命：标题栏页面缺失', shellFile);
  }
  win.loadFile(shellFile);

  // 壳页诊断：壳渲染不出来时窗口就没有标题栏和关闭按钮
  win.webContents.on('did-finish-load', () => log('[shell] finish load'));
  win.webContents.on('did-fail-load', (_e, code, desc) => log('[shell] fail load', code, desc));
  win.webContents.on('console-message', (_e, level, message) => log('[shell console]', String(message).slice(0, 200)));
  win.webContents.on('preload-error', (_e, p, err) => log('[shell] preload error', String(err)));

  const view = new WebContentsView({
    webPreferences: {
      preload: process.argv.includes('--no-margin') ? undefined : path.join(__dirname, 'preload.js'),
      contextIsolation: false, // 与页面同世界，等价于 content script 的运行环境
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: true,
      partition: PARTITION,
    },
  });
  win.zbView = view;
  // 铺深色底：WebContentsView 默认白底，页面渲染出来之前会闪一段白页。
  // 底色与壳一致，加载期观感是"深色渐入"而不是"白闪"。
  try {
    view.setBackgroundColor('#0e0f11');
  } catch {
    /* 个别平台不支持则忽略，仅影响加载期观感 */
  }

  win.contentView.addChildView(view);
  layout(win);

  // 诊断：页面加载链路
  const wc = view.webContents;
  wc.on('did-start-loading', () => {
    log('[nav] start loading');
    if (!win.webContents.isDestroyed()) win.webContents.send('app:loading', true);
  });
  wc.on('did-stop-loading', () => {
    log('[nav] stop loading');
    if (!win.webContents.isDestroyed()) win.webContents.send('app:loading', false);
    // 记住当前页，供「恢复上次页面」使用（每个窗口各自记住最后访问页）
    const u = wc.getURL();
    if (u && /^https?:\/\//.test(u)) {
      const cfg = store[ZB_KEY] || {};
      cfg.lastUrl = u;
      store[ZB_KEY] = cfg;
      persistSoon();
    }
  });
  wc.on('did-finish-load', () => log('[nav] finish load', wc.getURL()));
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) =>
    log('[nav] fail', { code, desc, url, isMainFrame })
  );
  wc.on('render-process-gone', (_e, d) => log('[nav] renderer gone', d));
  wc.on('preload-error', (_e, p, err) => log('[nav] preload error', p, String(err)));
  wc.on('console-message', (_e, level, msg, line, src) => {
    if (/MARGIN|shim|margin/i.test(msg)) log('[console]', msg.slice(0, 200), src, line);
  });
  log('[nav] 窗口已创建，开始加载', BILI_HOME);

  // 去掉 Electron 标识，B 站对 UA 有校验（风控 / 播放接口）
  const chromeVer = process.versions.chrome || '130.0.0.0';
  view.webContents.setUserAgent(
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVer} Safari/537.36`
  );

  const zbCfg = store[ZB_KEY] || {};
  const startupUrl = startUrlOverride || (zbCfg.restoreLast && zbCfg.lastUrl ? zbCfg.lastUrl : BILI_HOME);
  view.webContents.loadURL(startupUrl);

  // window.open / target=_blank：一律在当前视图内导航，不另开 web。
  // 弹新窗口 = 常驻第二个 B 站渲染进程，观感像弹窗、内存翻倍，关掉还容易残在后台；
  // 真需要并排时用标题栏的「+ 新窗口」显式开。站外链接丢给系统浏览器。
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\/([\w-]+\.)*(bilibili\.com|hdslb\.com|biliapi\.net)/.test(url)) {
      view.webContents.loadURL(url);
    } else if (/^https?:\/\//.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // 避免误触整页拖拽 / 右键菜单缺失
  win.on('resize', () => layout(win));
  win.once('ready-to-show', () => win.show());

  win.on('maximize', () => win.webContents.send('app:win-state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('app:win-state', { maximized: false }));

  if (IS_DEV) view.webContents.openDevTools({ mode: 'detach' });

  // --snapshot：自检模式，等页面稳定后抓图 + 输出分进程内存，然后退出。
  // 打包后的 exe 不能用命令行开关：Chromium 先解析 argv，遇到不认识的 --xxx 会直接
  // 报 "bad option" 并退出，窗口都起不来。所以打包版走环境变量。
  const IS_SNAPSHOT = process.argv.includes('--snapshot') || process.env.ZEROBILI_SNAPSHOT === '1';
  if (IS_SNAPSHOT) {
    log('[snapshot] 等待 dom-ready …');
    view.webContents.once('dom-ready', () => {
      log('[snapshot] dom-ready');
      setTimeout(async () => {
        try {
          const state = await view.webContents.executeJavaScript(`(() => {
            const host = document.getElementById('margin-root');
            const sr = host && host.shadowRoot;
            const q = (sel) => (sr ? sr.querySelector(sel) : null);
            const dash = q('.dash');
            const fp = q('.fp-card');
            return {
              url: location.href,
              marginRoot: !!host,
              marginWatch: !!document.getElementById('margin-watch-top'),
              htmlClass: document.documentElement.className,
              hasVideo: !!document.querySelector('video'),
              hideStyle: !!document.getElementById('margin-hide'),
              bgCanvas: sr ? sr.querySelectorAll('canvas').length : 0,
              nodes: document.querySelectorAll('*').length,
              shadowNodes: sr ? sr.querySelectorAll('*').length : 0,
              cards: sr ? sr.querySelectorAll('.card').length : 0,
              dashHidden: dash ? dash.hidden : null,
              dashChildren: dash ? dash.children.length : 0,
              hasFootprint: !!fp,
              fpBox: fp ? Math.round(fp.getBoundingClientRect().width) + 'x' + Math.round(fp.getBoundingClientRect().height) : null,
              fpTop: fp ? Math.round(fp.getBoundingClientRect().top) : null,
              fpOpacity: fp ? getComputedStyle(fp).opacity : null,
              heroBox: (() => { const e = q('.hero-search'); if (!e) return null; const b = e.getBoundingClientRect(); return Math.round(b.top) + ',' + Math.round(b.height); })(),
              barTop: (() => { const e = q('.bar'); return e ? Math.round(e.getBoundingClientRect().top) : null; })(),
              scrollY: Math.round(window.scrollY),
              weatherGone: !sr || sr.querySelectorAll('.wx').length === 0,
              glassFilter: (() => { const g = q('.et'); return g ? getComputedStyle(g).backdropFilter : null; })(),
              title: document.title.slice(0, 30),
            };
          })()`);
          log('[snapshot] 页面状态', state);
          // 壳页状态：窗口是 frame:false，标题栏全靠这个页面画出来
          try {
            const shellState = await win.webContents.executeJavaScript(`(() => {
              const bar = document.querySelector('.bar');
              const btns = document.querySelectorAll('.winbtns button');
              const b = bar ? bar.getBoundingClientRect() : null;
              return {
                title: document.title,
                api: typeof window.api,
                barExists: !!bar,
                barBox: b ? Math.round(b.width) + 'x' + Math.round(b.height) : null,
                winButtons: btns.length,
                closeExists: !!document.getElementById('close'),
                settingsBtn: !!document.getElementById('settingsBtn'),
                settingsPanel: !!document.getElementById('settingsPanel'),
                bodyBg: getComputedStyle(document.body).backgroundColor,
                docHeight: document.documentElement.scrollHeight,
              };
            })()`);
            log('[snapshot] 壳状态', shellState);
          } catch (e) {
            log('[snapshot] 壳状态读取失败', String(e));
          }
          const shot = await view.webContents.capturePage();
          fs.writeFileSync(path.join(OUT_DIR, 'shot.png'), shot.toPNG());
          // 无边框窗口在隐藏状态下 capturePage 会返回全黑，截壳之前先确保真的显示出来
          if (!win.isVisible()) win.show();
          win.moveTop();
          await new Promise((r) => setTimeout(r, 900));
          // 足迹卡单独截一张：确认它是有内容还是空壳
          try {
            const fpInfo = await view.webContents.executeJavaScript(`(() => {
              const sr = document.getElementById('margin-root').shadowRoot;
              const f = sr.querySelector('.fp-card');
              if (!f) return null;
              const b = f.getBoundingClientRect();
              return { x: Math.round(b.x), y: Math.round(b.y - 40), width: Math.round(b.width), height: Math.round(b.height), kids: f.children.length, text: (f.textContent || '').replace(/\\s+/g, ' ').slice(0, 120) };
            })()`);
            log('[snapshot] 足迹卡', fpInfo);
            if (fpInfo && fpInfo.width > 10) {
              const fpShot = await view.webContents.capturePage({ x: fpInfo.x, y: fpInfo.y, width: fpInfo.width, height: fpInfo.height });
              fs.writeFileSync(path.join(OUT_DIR, 'shot-fp.png'), fpShot.toPNG());
            }
          } catch (e) {
            log('[snapshot] 足迹卡截图失败', String(e));
          }
          const chrome = await win.webContents.capturePage();
          fs.writeFileSync(path.join(OUT_DIR, 'shot-shell.png'), chrome.toPNG());
          log('[snapshot] 截图已保存 shot.png');
          const mem = memorySnapshot();
          log('[snapshot] 内存', mem);
          log('[snapshot] 明细', app.getAppMetrics().map((m) => `${m.type}#${m.pid}=${Math.round((m.memory?.workingSetSize ?? 0) / 1024)}MB`).join(' '));
        } catch (e) {
          log('[snapshot] 失败', String(e));
        }
        app.quit();
      }, 9000);
    });
  }

  // 关闭时回收：必须显式销毁内容 webContents。
  // 只解引用的话，渲染进程会跟着残留（网页关了仍挂在后台、内存不掉）。
  win.on('closed', () => {
    windows.delete(win);
    const v = win.zbView;
    win.zbView = null;
    if (v) {
      try {
        if (!v.webContents.isDestroyed()) v.webContents.close();
      } catch (e) {
        log('[close] 内容视图销毁失败', String(e));
      }
    }
  });

  return win;
}

function layout(win) {
  const view = win.zbView;
  if (!win || !view) return;
  const { width, height } = win.getContentBounds();
  const extra = win.zbTitleExtra || 0;
  view.setBounds({
    x: 0,
    y: TITLEBAR_HEIGHT + extra,
    width,
    height: Math.max(0, height - TITLEBAR_HEIGHT - extra),
  });
}

// ---------------------------------------------------------------- 窗口控制 IPC
ipcMain.on('win:minimize', (e) => {
  const w = windowOf(e.sender);
  w?.minimize();
});
ipcMain.on('win:toggle-maximize', (e) => {
  const w = windowOf(e.sender);
  if (!w) return;
  w.isMaximized() ? w.unmaximize() : w.maximize();
});
ipcMain.on('win:close', (e) => {
  const w = windowOf(e.sender);
  w?.close();
});
ipcMain.on('win:set-panel', (e, h) => {
  const w = windowOf(e.sender);
  if (!w) return;
  w.zbTitleExtra = Math.max(0, Math.floor(Number(h) || 0));
  layout(w);
});
ipcMain.on('win:navigate', (e, action) => {
  const w = windowOf(e.sender);
  const wc = w && w.zbView && w.zbView.webContents;
  if (!wc) return;
  if (action === 'back' && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  if (action === 'forward' && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  if (action === 'reload') wc.reload();
  if (action === 'home') wc.loadURL(BILI_HOME);
});
ipcMain.handle('win:state', (e) => {
  const w = windowOf(e.sender);
  return { maximized: !!(w && w.isMaximized()) };
});

// ---------------------------------------------------------------- 会话配置
function configureSession() {
  const ses = session.fromPartition(PARTITION);

  // 0) 自定义协议必须注册在内容视图实际使用的会话上（defaultSession 上的注册对它无效）
  registerMarginProtocol(ses);

  // 1) 剥掉 B 站页面的 CSP：MARGIN 要用 margin:// 动态 import 页面模块、注入字体。
  //    只对主文档动手，子资源沿用原有响应头。
  ses.webRequest.onHeadersReceived((details, cb) => {
    if (details.resourceType !== 'mainFrame') return cb({});
    const headers = { ...details.responseHeaders };
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'content-security-policy') delete headers[k];
      if (k.toLowerCase() === 'content-security-policy-report-only') delete headers[k];
    }
    cb({ responseHeaders: headers });
  });

  // 2) 站内导航保持在客户端内；外部协议交系统
  ses.setPermissionRequestHandler((_wc, permission, cb) => {
    // 只放行播放需要的媒体相关权限
    cb(['media', 'fullscreen', 'clipboard-read'].includes(permission));
  });
}

// ---------------------------------------------------------------- 退出前落盘
/**
 * 两件容易丢的东西，退出时主动写一次：
 * 1) MARGIN 设置是 300ms 防抖写文件，点了开关马上关窗口就会丢
 * 2) 登录 cookie 正常退出 Chromium 会刷盘，但强杀进程 / 崩溃时不会
 */
function flushOnQuit() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      fs.writeFileSync(STORE_FILE(), JSON.stringify(store), 'utf8');
    } catch (e) {
      log('[quit] 设置落盘失败', String(e));
    }
  }
  try {
    const ses = session.fromPartition(PARTITION);
    if ((store[ZB_KEY] || {}).privacy) {
      // 隐私模式：退出即焚，不保留登录态与本地数据
      ses.clearStorageData({
        storages: ['cookies', 'local_storage', 'session_storage', 'indexed_db'],
      }).catch(() => {});
    } else {
      ses.cookies.flushStore().catch(() => {});
    }
  } catch (e) {
    log('[quit] cookie 处理失败', String(e));
  }
}
app.on('before-quit', flushOnQuit);

// ---------------------------------------------------------------- 生命周期
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 已有一个进程在跑：聚焦到最前面的窗口（不重复拉起进程）
    let top = null;
    for (const w of windows) if (!w.isDestroyed() && (!top || w.isVisible())) top = w;
    if (top) {
      if (top.isMinimized()) top.restore();
      top.focus();
    } else {
      createWindow();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    loadStore();
    seedLeanDefaults();
    configureSession();
    createWindow();

    // 全局内存心跳：广播到所有窗口
    memTimer = setInterval(() => {
      const snap = memorySnapshot();
      for (const w of windows) {
        if (!w.isDestroyed() && !w.webContents.isDestroyed()) w.webContents.send('app:memory-tick', snap);
      }
    }, 2000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
