/**
 * 用 CDP 检查「系统 Edge + 未打包扩展」这条路的真实效果。
 * 前提：Edge 已带 --remote-debugging-port=9333 启动。
 */
import fs from 'node:fs';

const PORT = 9333;
const OUT = process.argv[2] || 'edge-probe.png';

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && /bilibili|biligame/i.test(t.url));
if (!page) {
  console.log('没找到 B 站页面，targets:', list.map((t) => `${t.type}:${t.url}`).join(' | '));
  process.exit(1);
}
console.log('目标页面:', page.url);

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
});

await new Promise((r) => ws.addEventListener('open', r, { once: true }));

const expr = `(() => {
  const host = document.getElementById('margin-root');
  const sr = host && host.shadowRoot;
  return {
    marginRoot: !!host,
    shadowNodes: sr ? sr.querySelectorAll('*').length : 0,
    cards: sr ? sr.querySelectorAll('.card').length : 0,
    hideStyle: !!document.getElementById('margin-hide'),
    nodes: document.querySelectorAll('*').length,
    title: document.title.slice(0, 30),
    ua: navigator.userAgent.slice(0, 80),
  };
})()`;

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
console.log('页面状态:', JSON.stringify(r.result.value));

const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
console.log('截图:', OUT);
ws.close();
