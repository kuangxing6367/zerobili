/**
 * Firefox 实测：用 Marionette 协议加载未签名临时扩展，验证 MARGIN 能否在 Gecko 上跑起来。
 * 全程 headless，不开窗口，不打扰桌面。
 */
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const FF = 'H:\\firebox\\firefox.exe';
const PROFILE = 'E:\\ff-margin-test';
const EXT = 'E:\\ff-dist';
const PORT = 2828;
const OUT = 'E:\\ff-probe.png';

class Marionette {
  constructor(sock) {
    this.sock = sock;
    this.buf = Buffer.alloc(0);
    this.seq = 0;
    this.pending = new Map();
    sock.on('data', (c) => this._onData(c));
    sock.on('error', () => {});
  }

  static connect(port, timeout = 40000) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      const attempt = () => {
        const s = net.connect(port, '127.0.0.1');
        s.once('connect', () => resolve(new Marionette(s)));
        s.once('error', () => {
          s.destroy();
          if (Date.now() - t0 > timeout) reject(new Error('marionette 连接超时'));
          else setTimeout(attempt, 500);
        });
      };
      attempt();
    });
  }

  _onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      const colon = this.buf.indexOf(0x3a);
      if (colon < 0) return;
      const len = Number(this.buf.slice(0, colon).toString());
      if (!Number.isFinite(len)) return;
      if (this.buf.length < colon + 1 + len) return;
      const body = this.buf.slice(colon + 1, colon + 1 + len).toString('utf8');
      this.buf = this.buf.slice(colon + 1 + len);
      let msg;
      try { msg = JSON.parse(body); } catch { continue; }
      // 握手包是对象，不是数组
      if (!Array.isArray(msg)) { this.handshake = msg; continue; }
      const [, id, err, res] = msg;
      const p = this.pending.get(id);
      if (!p) continue;
      this.pending.delete(id);
      if (err) p.reject(new Error(`${err.error}: ${err.message}`));
      else p.resolve(res);
    }
  }

  send(name, params = {}) {
    const id = ++this.seq;
    const payload = JSON.stringify([0, id, name, params]);
    const frame = Buffer.byteLength(payload) + ':' + payload;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sock.write(frame);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${name} 超时`));
        }
      }, 60000);
    });
  }

  close() { try { this.sock.destroy(); } catch {} }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const log = (...a) => console.log(...a);

  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(PROFILE, { recursive: true });
  fs.writeFileSync(
    path.join(PROFILE, 'user.js'),
    [
      'user_pref("browser.shell.checkDefaultBrowser", false);',
      'user_pref("browser.aboutwelcome.enabled", false);',
      'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
      'user_pref("toolkit.telemetry.enabled", false);',
      'user_pref("browser.sessionstore.resume_from_crash", false);',
      'user_pref("extensions.autoDisableScopes", 0);',
      'user_pref("xpinstall.signatures.required", false);',
    ].join('\n')
  );

  const HEADFUL = process.argv.includes('--headful');
  const STAY = HEADFUL ? 95 : 20;
  const args = ['-profile', PROFILE, '-new-instance', '--marionette', '-remote-allow-system-access'];
  if (!HEADFUL) args.push('-headless');
  args.push('about:blank');
  const ff = spawn(FF, args, { stdio: 'ignore', detached: false });

  log('[1] Firefox 已启动 pid=' + ff.pid + '，等待 Marionette 端口…');

  let m;
  try {
    m = await Marionette.connect(PORT);
  } catch (e) {
    log('!! 连接失败: ' + e.message);
    ff.kill();
    process.exit(1);
  }
  log('[2] 握手: ' + JSON.stringify(m.handshake));

  try {
    await m.send('WebDriver:NewSession', { capabilities: {} });
    log('[3] 会话已建立');

    // 装临时扩展必须在 chrome 上下文
    await m.send('Marionette:SetContext', { value: 'chrome' });
    try {
      const r = await m.send('Addon:Install', { path: EXT, temporary: true });
      log('[4] 扩展安装: ' + JSON.stringify(r));
    } catch (e) {
      log('[4] 扩展安装失败: ' + e.message);
    }
    await m.send('Marionette:SetContext', { value: 'content' });

    const TARGET = process.env.MARGIN_URL || 'https://www.bilibili.com/';
    await m.send('WebDriver:Navigate', { url: TARGET });
    log('[5] 已导航，等待渲染 ' + STAY + 's…');
    await sleep(STAY * 1000);

    const script = `
      const root = document.getElementById('margin-root');
      const deep = (sel) => {
        let n = 0;
        const walk = (node) => {
          if (!node) return;
          node.querySelectorAll && node.querySelectorAll('*').forEach((e) => { n++; if (e.shadowRoot) walk(e.shadowRoot); });
        };
        walk(document);
        return n;
      };
      return {
        url: location.href,
        title: document.title.slice(0, 30),
        marginRoot: !!root,
        hideStyle: !!document.getElementById('margin-hide'),
        nodes: document.querySelectorAll('*').length,
        allNodesDeep: deep(),
        scope: typeof browser !== 'undefined' ? 'browser' : (typeof chrome !== 'undefined' ? 'chrome' : 'none'),
        ua: navigator.userAgent.slice(0, 90),
        mse: typeof MediaSource,
        hasVideo: !!document.querySelector('video'),
        videoState: (() => {
          const v = document.querySelector('video');
          if (!v) return null;
          return { readyState: v.readyState, paused: v.paused, cur: Math.round(v.currentTime * 10) / 10, dur: Math.round(v.duration || 0), w: v.videoWidth, h: v.videoHeight, err: v.error ? v.error.code : null };
        })(),
        watchSkin: document.documentElement.className.slice(0, 60),
      };
    `;
    const res = await m.send('WebDriver:ExecuteScript', { script, args: [] });
    log('[6] 页面状态: ' + JSON.stringify(res.value));

    // 控制台错误抓取
    const errScript = `
      return (window.__marginErrors || []).slice(0, 5);
    `;
    try {
      const e2 = await m.send('WebDriver:ExecuteScript', { script: errScript, args: [] });
      log('[7] 页面内错误: ' + JSON.stringify(e2.value));
    } catch {}

    if (process.env.MARGIN_URL) {
      log('[7.5] 播放页复查中…');
      await sleep(8000);
      const v2 = await m.send('WebDriver:ExecuteScript', { script: `
        const v = document.querySelector('video');
        return { cur: v ? Math.round(v.currentTime*10)/10 : null, paused: v ? v.paused : null, rs: v ? v.readyState : null, w: v ? v.videoWidth : 0 };
      `, args: [] });
      log('[7.6] 播放进度: ' + JSON.stringify(v2.value));
    }

    try {
      const shot = await m.send('WebDriver:TakeScreenshot', { full: false, hash: false });
      fs.writeFileSync(OUT, Buffer.from(shot.value, 'base64'));
      log('[8] 截图: ' + OUT);
    } catch (e) {
      log('[8] 截图失败: ' + e.message);
    }

    try { await m.send('WebDriver:DeleteSession', {}); } catch {}
  } catch (e) {
    log('!! 流程失败: ' + e.message);
  }

  m.close();
  ff.kill();
  await sleep(1500);
  process.exit(0);
})();
