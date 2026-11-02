/**
 * Android 端探针：通过 WebView 的 CDP 通道在页面里跑一段 JS，把状态打回来。
 *
 *   1) adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
 *   2) node tests/android-probe.mjs [表达式文件]
 *
 * 前提：debug 包（WebView 调试默认开）。release 包要先 setWebContentsDebuggingEnabled。
 */
const EXPR = process.argv[2] || `JSON.stringify({
  url: location.href,
  title: document.title,
  marginRoot: !!document.getElementById('margin-root'),
  marginWatch: !!document.getElementById('margin-watch-top'),
  htmlClass: document.documentElement.className,
  nodes: document.querySelectorAll('*').length,
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  dpr: window.devicePixelRatio,
  vvScale: window.visualViewport ? +window.visualViewport.scale.toFixed(3) : null,
  viewportMeta: (document.querySelector('meta[name=viewport]') || {}).content || null,
  hasVideo: !!document.querySelector('video'),
  cards: (() => {
    const r = document.getElementById('margin-root');
    const sr = r && r.shadowRoot;
    return sr ? sr.querySelectorAll('.card').length : 0;
  })(),
  shim: !!window.__zbShim,
  content: !!window.__zbContentInjected
})`;

const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = list.find((p) => p.type === 'page');
if (!page) {
  console.error('没找到可调试的页面，先确认 adb forward 和 app 是否在跑');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
const timer = setTimeout(() => {
  console.error('超时');
  process.exit(1);
}, 15000);

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: EXPR, returnByValue: true, awaitPromise: true },
    })
  );
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id !== 1) return;
  clearTimeout(timer);
  const r = msg.result?.result;
  if (msg.result?.exceptionDetails) {
    console.error('执行出错:', JSON.stringify(msg.result.exceptionDetails.exception, null, 2));
  } else {
    console.log(typeof r?.value === 'string' ? r.value : JSON.stringify(r?.value, null, 2));
  }
  ws.close();
  process.exit(0);
};

ws.onerror = (e) => {
  console.error('ws 错误', e.message);
  process.exit(1);
};
