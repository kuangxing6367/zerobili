/**
 * Android 端构建入口。
 *
 *   npm run android           debug APK（debug 签名，可直接装）
 *   npm run android:release    release APK（有 ZEROBILI_KEYSTORE 就用它签，没有退回 debug 签名）
 *
 * Gradle 只在 android/ 下跑，产物拷到 release/，和桌面端安装包放一起。
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const pkg = require(path.join(root, 'package.json'));

const mode = process.argv.includes('release') ? 'release' : 'debug';
const task = mode === 'release' ? ':app:assembleRelease' : ':app:assembleDebug';
const apkRel =
  mode === 'release'
    ? 'app/build/outputs/apk/release/app-release.apk'
    : 'app/build/outputs/apk/debug/app-debug.apk';

// ---------------------------------------------------------------- 环境
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');

if (!fs.existsSync(sdk)) {
  console.error(`找不到 Android SDK：${sdk}`);
  console.error('装 Android SDK 后设置 ANDROID_HOME，或把 SDK 放到默认位置。');
  process.exit(1);
}

const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
delete env.ELECTRON_RUN_AS_NODE;

// 优先用工程里的 wrapper（版本可复现），没有就用系统 gradle
const wrapper = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const useWrapper = fs.existsSync(wrapper);
const bin = useWrapper ? wrapper : process.platform === 'win32' ? 'gradle.bat' : 'gradle';

console.log(`[android] ${mode} 构建，使用 ${useWrapper ? './gradlew' : '系统 gradle'}`);
const r = spawnSync(bin, [task, '--console=plain'], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (r.status !== 0) {
  console.error('[android] 构建失败');
  process.exit(r.status ?? 1);
}

// ---------------------------------------------------------------- 收集产物
const apk = path.join(androidDir, apkRel);
if (!fs.existsSync(apk)) {
  console.error(`[android] 没找到产物：${apk}`);
  process.exit(1);
}

const outDir = path.join(root, 'release');
fs.mkdirSync(outDir, { recursive: true });
const suffix = mode === 'release' ? '' : '-debug';
const out = path.join(outDir, `zerobili-${pkg.version}-android${suffix}.apk`);
fs.copyFileSync(apk, out);

const mb = (fs.statSync(out).size / 1048576).toFixed(1);
console.log(`[android] 完成 → ${out}  (${mb} MB)`);
