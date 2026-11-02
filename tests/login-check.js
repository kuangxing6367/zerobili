/**
 * 端到端验证：用应用真实的分区（persist:bili）加载 B 站，问服务端“我是谁”。
 * 只读验证，不写任何数据。
 */
const { app, session, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('appData'), 'bili-margin-client'));
const OUT = path.join(__dirname, '..', 'login-check.log');
fs.writeFileSync(OUT, '');
const log = (s) => fs.appendFileSync(OUT, s + '\n');

app.whenReady().then(async () => {
  const ses = session.fromPartition('persist:bili');
  const cookies = await ses.cookies.get({ domain: '.bilibili.com' });
  log('分区内 .bilibili.com cookie: ' + cookies.map((c) => c.name).join(','));

  const win = new BrowserWindow({
    show: false,
    webPreferences: { partition: 'persist:bili', contextIsolation: false, nodeIntegration: false, sandbox: false },
  });
  await win.loadURL('https://www.bilibili.com/');
  // 等页面里的脚本跑完，再用页面自己的 origin 发请求，cookie 会自动带上
  const info = await win.webContents.executeJavaScript(`(async () => {
    try {
      const r = await fetch('https://api.bilibili.com/x/web-interface/nav', { credentials: 'include' });
      const j = await r.json();
      return {
        httpStatus: r.status,
        code: j.code,
        isLogin: j.data && j.data.isLogin,
        uname: j.data && j.data.uname,
        mid: j.data && j.data.mid,
        vip: j.data && j.data.vipStatus,
        level: j.data && j.data.level_info && j.data.level_info.current_level,
        docCookieNames: document.cookie.split(';').map(s => s.split('=')[0].trim()).filter(Boolean),
      };
    } catch (e) { return { err: String(e) }; }
  })()`);
  log('nav 接口: ' + JSON.stringify(info));
  win.destroy();
  app.quit();
}).catch((e) => {
  log('失败: ' + String(e));
  app.quit();
});
