/**
 * 把 MARGIN 的构建产物同步到两个壳里：
 *   vendor/margin                        Electron 用
 *   android/app/src/main/assets/margin   Android 用
 *
 * 只维护 vendor/margin 一份源，另一份由这个脚本镜像过去，避免两端版本漂移。
 * 默认从同级目录的 margin-src/dist 取；换目录时用环境变量指定：
 *   MARGIN_SRC="D:\\code\\bilibili-margin\\dist" npm run sync
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.resolve(process.env.MARGIN_SRC || path.join(root, '..', 'margin-src', 'dist'));
const dst = path.join(root, 'vendor', 'margin');
const androidDst = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'margin');

if (!fs.existsSync(path.join(src, 'manifest.json'))) {
  console.error(`找不到 MARGIN 产物：${src}`);
  console.error('请先在 MARGIN 仓库里执行 npm run build，或用 MARGIN_SRC 指定 dist 目录。');
  process.exit(1);
}

const mb = (p) => {
  let total = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    total += e.isDirectory() ? mb(f) : fs.statSync(f).size;
  }
  return total;
};

const mirror = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
};

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });
fs.cpSync(src, dst, { recursive: true });

console.log(`已同步 ${src}`);
console.log(`  → ${dst}  (${(mb(dst) / 1048576).toFixed(1)} MB)`);

// 桌面端的 popup/pages 里有些东西 Android 用不到，但整份镜像最简单也最不容易漏
mirror(dst, androidDst);
console.log(`  → ${androidDst}  (${(mb(androidDst) / 1048576).toFixed(1)} MB)`);
