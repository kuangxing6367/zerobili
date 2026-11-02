/**
 * 打包入口：设置好国内可用的镜像后再调 electron-builder。
 *
 * 两个下载源都可能卡住：
 *  - electron 本体          → ELECTION_MIRROR（npmmirror 有完整镜像）
 *  - winCodeSign / nsis     → ELECTRON_BUILDER_BINARIES_MIRROR，只在 GitHub 上
 * GitHub 直连在国内基本不通，所以后者走 gh-proxy 前缀。
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');

const env = {
  ...process.env,
  ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
  ELECTRON_BUILDER_BINARIES_MIRROR:
    'https://gh-proxy.org/https://github.com/electron-userland/electron-builder-binaries/releases/download/',
};

// ELECTRON_RUN_AS_NODE 会让 npx/electron 相关工具行为异常
delete env.ELECTRON_RUN_AS_NODE;

console.log('[dist] 开始打包（镜像已配置）');
const args = ['electron-builder', '--win', 'nsis', '--x64', '--publish', 'never'];
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(r.status ?? 1);
