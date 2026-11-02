/**
 * Android WebView 里的 chrome.* shim —— 和桌面端 electron/preload.js 对应。
 *
 * 桌面端把 storage 落到 IPC / 主进程 JSON 文件；这里没有主进程，直接落到
 * localStorage（同源、随登录态一起存活、进程重启不丢）。键统一加 `zb:`
 * 前缀，避免和 B 站页面自己的键撞车。
 *
 * MARGIN 实际只用到这几项：
 *   chrome.storage.local.get / set / remove
 *   chrome.storage.onChanged.addListener
 *   chrome.runtime.getURL
 *   chrome.runtime.sendMessage / onMessage.addListener
 */
(function () {
  'use strict';

  if (window.__zbShim) return;
  window.__zbShim = true;

  // ---------------------------------------------------------------- 视口
  /**
   * MARGIN 的排版是按桌面宽度设计的，没有做移动端断点。WebView 在没有 viewport
   * meta 时按 980 布局（Google 的老约定），手机上整体缩到 0.42 倍，字太小。
   *
   * 这里在文档最早阶段钉一个 860 的视口：
   *   - 980 → 卡片 5 列，缩放到 411dp 屏上每列只剩 ~80dp
   *   - 860 → 卡片 3 列，列宽 264，正文能看清
   * 再窄（760）卡片会挤到贴边、顶栏分区导航换行，所以 860 是这一档里的上限。
   * 只影响 Android 端，桌面端走的是 Electron 的窗口尺寸。
   */
  var VIEWPORT_WIDTH = 860;

  (function ensureViewport() {
    function apply() {
      var head = document.head;
      if (!head) return false;
      var meta = head.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        head.insertBefore(meta, head.firstChild);
      }
      meta.setAttribute('content', 'width=' + VIEWPORT_WIDTH);
      return true;
    }
    if (apply()) return;
    var mo = new MutationObserver(function () {
      if (apply()) mo.disconnect();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () {
      mo.disconnect();
    }, 4000);
  })();

  // 用当前 origin 拼资源地址：B 站有 www / space / t / message / live 多个子域，
  // 写死 www 会让 space 变成跨域，动态 import 直接被 CORS 拦掉。
  var RES_ROOT = location.origin + '/__margin__/';
  var PREFIX = 'zb:';

  // console 里能直接看出注入是否生效
  console.log('[zb] shim', location.href);

  function readRaw(k) {
    try {
      var s = localStorage.getItem(PREFIX + k);
      return s == null ? undefined : JSON.parse(s);
    } catch (e) {
      return undefined;
    }
  }

  function writeRaw(k, v) {
    try {
      localStorage.setItem(PREFIX + k, JSON.stringify(v));
    } catch (e) {
      console.error('[zb] 写入失败', k, e);
    }
  }

  function delRaw(k) {
    try {
      localStorage.removeItem(PREFIX + k);
    } catch (e) {
      /* ignore */
    }
  }

  function allKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
    }
    return out;
  }

  var changeListeners = [];

  function emit(changes) {
    if (!changes || !Object.keys(changes).length) return;
    changeListeners.slice().forEach(function (fn) {
      try {
        fn(changes, 'local');
      } catch (e) {
        console.error('[zb] onChanged listener', e);
      }
    });
  }

  function pick(keys) {
    var all = {};
    allKeys().forEach(function (k) {
      all[k] = readRaw(k);
    });
    if (keys == null) return all;

    var want;
    var defaults = null;
    if (typeof keys === 'string') want = [keys];
    else if (Array.isArray(keys)) want = keys;
    else if (typeof keys === 'object') {
      want = Object.keys(keys);
      defaults = keys;
    } else return all;

    var out = {};
    want.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(all, k)) out[k] = all[k];
      else if (defaults) out[k] = defaults[k];
    });
    return out;
  }

  var storageLocal = {
    get: function (keys) {
      return new Promise(function (resolve) {
        resolve(pick(keys));
      });
    },
    set: function (obj) {
      return new Promise(function (resolve) {
        var changes = {};
        Object.keys(obj || {}).forEach(function (k) {
          var oldValue = readRaw(k);
          writeRaw(k, obj[k]);
          changes[k] = { oldValue: oldValue, newValue: obj[k] };
        });
        resolve();
        emit(changes);
      });
    },
    remove: function (keys) {
      return new Promise(function (resolve) {
        var list = typeof keys === 'string' ? [keys] : keys || [];
        var changes = {};
        list.forEach(function (k) {
          var oldValue = readRaw(k);
          delRaw(k);
          changes[k] = { oldValue: oldValue };
        });
        resolve();
        emit(changes);
      });
    },
    clear: function () {
      return new Promise(function (resolve) {
        var changes = {};
        allKeys().forEach(function (k) {
          changes[k] = { oldValue: readRaw(k) };
          delRaw(k);
        });
        resolve();
        emit(changes);
      });
    }
  };

  // ------------------------------------------------------------- 消息总线
  var msgListeners = [];

  function sendMessage(msg, cb) {
    return new Promise(function (resolve) {
      if (!msgListeners.length) {
        if (typeof cb === 'function') cb(undefined);
        resolve(undefined);
        return;
      }
      var settled = false;
      function respond(v) {
        if (settled) return;
        settled = true;
        resolve(v);
        if (typeof cb === 'function') {
          try {
            cb(v);
          } catch (e) {
            /* ignore */
          }
        }
      }
      var async = false;
      msgListeners.slice().forEach(function (fn) {
        try {
          // 和 chrome 一致：listener 返回 true 表示会异步 sendResponse
          if (fn(msg, { id: 'zerobili', url: location.href }, respond) === true) async = true;
        } catch (e) {
          console.error('[zb] onMessage listener', e);
        }
      });
      if (!async) respond(undefined);
    });
  }

  // ------------------------------------------------------------- manifest
  var manifest = { manifest_version: 3, name: 'MARGIN', version: '0.0.0' };
  try {
    if (typeof __ZB_MANIFEST__ === 'object' && __ZB_MANIFEST__) manifest = __ZB_MANIFEST__;
  } catch (e) {
    /* 占位符没被替换时用默认值 */
  }

  var shim = {
    storage: {
      local: storageLocal,
      // MARGIN 只用 local，sync 指同一份，避免个别代码路径炸掉
      sync: storageLocal,
      onChanged: {
        addListener: function (fn) {
          changeListeners.push(fn);
        },
        removeListener: function (fn) {
          var i = changeListeners.indexOf(fn);
          if (i >= 0) changeListeners.splice(i, 1);
        }
      }
    },
    runtime: {
      id: 'zerobili',
      getURL: function (p) {
        return RES_ROOT + String(p).replace(/^\/+/, '');
      },
      getManifest: function () {
        return manifest;
      },
      getContexts: function () {
        return [];
      },
      sendMessage: sendMessage,
      onMessage: {
        addListener: function (fn) {
          msgListeners.push(fn);
        },
        removeListener: function (fn) {
          var i = msgListeners.indexOf(fn);
          if (i >= 0) msgListeners.splice(i, 1);
        }
      },
      onInstalled: {
        addListener: function (fn) {
          // WebView 里没有安装事件，直接跑一次，等价于扩展首次安装
          setTimeout(function () {
            try {
              fn({ reason: 'install' });
            } catch (e) {
              console.error('[zb] onInstalled', e);
            }
          }, 0);
        }
      },
      onStartup: {
        addListener: function () {
          /* noop */
        }
      }
    },
    i18n: {
      getMessage: function (k) {
        return k;
      }
    }
  };

  // WebView 自带的 window.chrome 只有 loadTimes/csi，把扩展 API 挂上去。
  // 不用 Object.assign：chrome 上那几个属性在某些 WebView 版本里是只读的，赋值会抛错。
  if (typeof window.chrome !== 'object' || window.chrome === null) window.chrome = {};
  window.chrome.storage = shim.storage;
  window.chrome.runtime = shim.runtime;
  window.chrome.i18n = shim.i18n;
})();
