/**
 * 登录态持久化实测：同一个分区（persist:bili）跨进程写读。
 * 用法：
 *   electron tests/cookie-persist.js --write   写入一条 cookie 并落盘
 *   electron tests/cookie-persist.js --read    重新启动后读回
 *   electron tests/cookie-persist.js --clean   清掉测试 cookie
 */
const { app, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// 必须指向应用真实使用的 userData，否则测的是另一个分区
app.setPath('userData', path.join(app.getPath('appData'), 'bili-margin-client'));

const OUT = path.join(__dirname, '..', 'cookie-test.log');
fs.writeFileSync(OUT, '');
const log = (s) => fs.appendFileSync(OUT, s + '\n');

const NAME = 'MARGIN_PERSIST_TEST';
const PHASE = process.argv.includes('--write') ? 'write' : process.argv.includes('--clean') ? 'clean' : 'read';

app.whenReady().then(async () => {
  const ses = session.fromPartition('persist:bili');
  log(`阶段: ${PHASE}`);
  log(`userData: ${app.getPath('userData')}`);

  if (PHASE === 'write') {
    await ses.cookies.set({
      url: 'https://www.bilibili.com',
      name: NAME,
      value: 'hello-from-run-1',
      domain: '.bilibili.com',
      path: '/',
      secure: true,
      httpOnly: true,
      expirationDate: Math.floor(Date.now() / 1000) + 86400,
    });
    // 关键：显式刷盘，模拟“关掉应用立刻重启”的最坏情况
    await ses.cookies.flushStore();
    const all = await ses.cookies.get({ domain: '.bilibili.com' });
    log(`写入后本进程可见: ${all.some((c) => c.name === NAME)}，cookie 总数 ${all.length}`);
  } else {
    const all = await ses.cookies.get({});
    const hit = all.find((c) => c.name === NAME);
    log(`重启后读回 ${NAME}: ${hit ? '存在 value=' + hit.value : '不存在'}`);
    log(`分区内 cookie 总数: ${all.length}`);
    log(`B 站 cookie 名称: ${all.filter((c) => /bilibili/.test(c.domain || '')).map((c) => c.name).join(',')}`);
    if (PHASE === 'clean' && hit) {
      await ses.cookies.remove('https://www.bilibili.com', NAME);
      await ses.cookies.flushStore();
      log('已清理测试 cookie');
    }
  }

  app.quit();
}).catch((e) => {
  log('失败: ' + String(e));
  app.quit();
});
