# 第三方组件

本仓库自己的代码是 MIT（见 `LICENSE`）。下面这些东西不是我的，跟着各自的条款走。

## 映间 MARGIN（bilibili-margin）

- 项目：https://github.com/jiuyang5354/bilibili-margin
- 作者：jiuyang5354
- 许可：MIT（全文见 `vendor/MARGIN-LICENSE.txt`）

`vendor/margin/` 是它 `npm run build` 的产物，我在这份产物对应的源码上做了删改（去 3D 背景、去天气卡、削减模糊，详见 README）。MIT 允许修改与再分发，条件是保留版权声明和许可全文 —— 所以 `vendor/MARGIN-LICENSE.txt` 必须随产物一起分发，别删。

## 字体

`vendor/margin/fonts/` 下是 MARGIN 带的开源字体（Geist、Instrument Serif 等），各自的授权见：

- `vendor/margin/fonts/FONTS-LICENSES.md`（SIL Open Font License 为主）

## Electron / Chromium

Windows 端基于 Electron，安装包里含 Chromium 与 Node.js，各自的许可随安装目录分发（`resources/` 与 Electron 的 `LICENSE`、`LICENSES.chromium.html`）。

## Android

Android 端不打包任何第三方运行时：界面是系统 WebView（跟着系统 / Play 商店更新），构建只依赖 Android SDK 与 Android Gradle Plugin（Apache-2.0）。

## 商标与内容

B 站、哔哩哔哩、bilibili 及相关标识归上海幻电信息科技有限公司所有。本项目是非官方的第三方客户端，不提供任何视频内容，所有内容都由用户自己登录的 bilibili.com 页面加载。
