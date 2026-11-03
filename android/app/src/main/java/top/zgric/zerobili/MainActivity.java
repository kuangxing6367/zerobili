package top.zgric.zerobili;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * zerobili —— Android 端。
 *
 * 思路和桌面端一致：加载真实的 bilibili.com，把 MARGIN 的 content script 注入进去接管界面。
 * 区别只在于「扩展运行环境」的搭建方式：
 *
 *   桌面端                      Android
 *   -------------------------   -------------------------------------------
 *   margin:// 自定义协议    →   shouldInterceptRequest 拦 /__margin__/
 *   chrome.* 走 IPC          →   chrome.* shim 落 localStorage
 *   preload + webFrame       →   evaluateJavascript 轮询注入
 *
 * 页面永远是真正的 B 站页面，登录、播放、弹幕、评论全是原生能力。
 */
public class MainActivity extends Activity {

    private static final String HOME_URL = "https://www.bilibili.com/";
    private static final String ASSET_PATH = "/__margin__/";
    private static final String ASSET_DIR = "margin/";
    private static final String PREF = "zerobili";

    /** 播放页才需要跑的主世界钩子（原 manifest 里 world: MAIN 的那段） */
    private static final String CDN_PATH_RE =
            "^/(?:[a-z]{2}(?:-[A-Za-z]{2,4})?/)?(?:video/|bangumi/play/|list/|festival/|cheese/play/).*";

    /**
     * 窄屏补丁。
     *
     * MARGIN 的顶栏是照着桌面宽度排的：品牌 32 + 搜索 220 + acts 740，在 980 的视口里
     * 右边会顶出去 100px，表现为「投稿」按钮被裁掉半个、头像贴在屏幕边上。
     * 这里在它的 shadow root 里补一条窄屏规则，把投稿和搜索切换收起来，
     * 剩下的分区导航 + 头像刚好放得下。只在窄视口生效，桌面端不受影响。
     */
    private static final String MOBILE_PATCH_JS =
            "(function(){"
                    + "var r=document.getElementById('margin-root');"
                    + "if(!r||!r.shadowRoot) return 'no-root';"
                    + "if(r.shadowRoot.getElementById('zb-narrow')) return 'exists';"
                    + "var st=document.createElement('style');st.id='zb-narrow';"
                    + "st.textContent='@media (max-width:1180px){"
                    + ".top .acts .upload,.top .acts .ts{display:none!important}"
                    + ".top .acts{gap:6px!important}"
                    + ".top .search{max-width:200px!important}"
                    + "}';"
                    + "r.shadowRoot.appendChild(st);"
                    + "return 'patched';"
                    + "})()";

    /** 竖屏补丁：PC 站硬塞进窄屏时字太小。竖屏下把卡片改 2 列并放大字号，横屏还原。 */
    private static final String PORTRAIT_PATCH_JS =
            "(function(){"
                    + "var r=document.getElementById('margin-root');"
                    + "if(!r||!r.shadowRoot) return 'no-root';"
                    + "var root=r.shadowRoot;"
                    + "function apply(){"
                    + "  var st=root.getElementById('zb-portrait');"
                    + "  if(!st){st=document.createElement('style');st.id='zb-portrait';root.appendChild(st);}"
                    + "  if(window.innerHeight>window.innerWidth){"
                    + "    st.textContent='.home-grid{grid-template-columns:repeat(2,1fr)!important;gap:14px!important}'"
                    + "      +'.card{font-size:16px!important}'"
                    + "      +'.card .title{font-size:16px!important;line-height:1.45!important}'"
                    + "      +'.card .meta{font-size:13px!important}'"
                    + "      +'.card .dur,.card .reason{font-size:12px!important}';"
                    + "    return 'portrait';"
                    + "  } else { st.textContent=''; return 'landscape'; }"
                    + "}"
                    + "if(!window.__zbPortrait){window.__zbPortrait=true;"
                    + "  window.addEventListener('resize',apply);"
                    + "  window.addEventListener('orientationchange',function(){setTimeout(apply,200)});}"
                    + "return apply();"
                    + "})()";

    private FrameLayout root;
    private WebView web;
    private View fab;
    private View customView;
    private WebChromeClient.CustomViewCallback customCallback;

    private String shimJs;
    private String contentJs;
    private String backgroundJs;
    private String cdnJs;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private int injectAttempt = 0;

    // ---------------------------------------------------------------- 生命周期

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        loadScripts();

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0A0A0B"));
        setContentView(root);

        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        configureWebView();
        addFloatingButton();
        // 内容不要顶到状态栏下面：MARGIN 的顶栏是 sticky 的，压到状态栏会看不清
        applyStatusBarInset();

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            String start = getIntent() != null ? getIntent().getDataString() : null;
            web.loadUrl(start != null && start.startsWith("http") ? start : HOME_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        // 和桌面端退出时主动 flushStore 一个道理：不刷盘，强杀会丢登录态
        CookieManager.getInstance().flush();
        web.evaluateJavascript(
                "try{window.dispatchEvent(new Event('zb:hide'))}catch(e){}", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        super.onDestroy();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (customView != null) {
                hideCustomView();
                return true;
            }
            if (web.canGoBack()) {
                web.goBack();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    // ---------------------------------------------------------------- WebView

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        s.setLoadsImagesAutomatically(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUserAgentString(desktopUserAgent());
        s.setTextZoom(getSharedPreferences(PREF, MODE_PRIVATE).getInt("textZoom", 100));

        web.setBackgroundColor(Color.parseColor("#0A0A0B"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                injectAttempt = 0;
                inject(view);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // 导航刚开始那一下 evaluateJavascript 有可能落空，这里兜一次底
                injectAttempt = 0;
                inject(view);
                CookieManager.getInstance().flush();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, android.webkit.WebResourceError err) {
                if (req.isForMainFrame()) {
                    toast("加载失败：" + err.getDescription());
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                // 站内链接留在客户端，站外（QQ/微信登录、支付等）交给系统浏览器，
                // 这些回调本来就回不到当前分区，与其白等不如直接跳走
                if (url.startsWith("http")) {
                    if (isBiliHost(url)) return false;
                    try {
                        startActivity(new android.content.Intent(
                                android.content.Intent.ACTION_VIEW, req.getUrl()));
                    } catch (Exception ignored) {
                        toast("没有可打开该链接的应用");
                    }
                    return true;
                }
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                int idx = url.indexOf(ASSET_PATH);
                if (idx < 0) return null;
                String rel = url.substring(idx + ASSET_PATH.length());
                int q = rel.indexOf('?');
                if (q >= 0) rel = rel.substring(0, q);
                int h = rel.indexOf('#');
                if (h >= 0) rel = rel.substring(0, h);
                return assetResponse(rel);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customView = view;
                customCallback = callback;
                ((ViewGroup) getWindow().getDecorView()).addView(view,
                        new FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT));
                web.setVisibility(View.GONE);
                applyImmersive(true);
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }

            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest request) {
                // 扫码登录不需要摄像头；需要时再放开，别默认把权限交出去
                request.deny();
            }
        });
    }

    private void hideCustomView() {
        if (customView == null) return;
        ((ViewGroup) getWindow().getDecorView()).removeView(customView);
        customView = null;
        web.setVisibility(View.VISIBLE);
        if (customCallback != null) {
            customCallback.onCustomViewHidden();
            customCallback = null;
        }
        applyImmersive(false);
    }

    /** 去掉 Electron 标识、对齐桌面 Chrome，B 站按 UA 决定给 PC 页还是移动页 */
    private String desktopUserAgent() {
        String def = WebSettings.getDefaultUserAgent(this);
        String chrome = "130.0.0.0";
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("Chrome/([0-9.]+)").matcher(def);
        if (m.find()) chrome = m.group(1);
        return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/" + chrome + " Safari/537.36";
    }

    // ---------------------------------------------------------------- 注入

    private void loadScripts() {
        shimJs = readAsset("inject/shim.js");
        contentJs = readAsset(ASSET_DIR + "content.js");
        backgroundJs = readAsset(ASSET_DIR + "background.js");
        cdnJs = readAsset(ASSET_DIR + "cdn.js");
        // shim 里要同步拿到 manifest（版本号、名字），用真实文件替换占位符
        String manifest = readAsset(ASSET_DIR + "manifest.json");
        if (manifest != null && shimJs != null) {
            shimJs = shimJs.replace("__ZB_MANIFEST__", manifest.trim());
        }
    }

    /**
     * 一次 probe 完成三件事：shim 缺了补、DOM 没好就等、content 只注入一次。
     * 全部塞进一次 evaluateJavascript，省掉多次 IPC 的时序问题。
     */
    private void inject(WebView view) {
        if (contentJs == null) {
            toast("注入脚本缺失：assets/margin 没同步");
            return;
        }
        final String probe = "(function(){"
                + "if(!window.__zbShim) return 'nosim';"
                + "if(window.__zbContentInjected) return 'done';"
                + "if(!document.documentElement) return 'wait';"
                + "window.__zbContentInjected = 1;"
                + "return 'go';"
                + "})()";

        view.evaluateJavascript(probe, value -> {
            if (value == null) return;
            if (value.contains("nosim")) {
                if (shimJs != null) view.evaluateJavascript(shimJs + "\n;void 0;", null);
                retry(view);
            } else if (value.contains("go")) {
                if (backgroundJs != null) view.evaluateJavascript(backgroundJs + "\n;void 0;", null);
                String url = view.getUrl();
                String path = url == null ? "/" : String.valueOf(android.net.Uri.parse(url).getPath());
                if (cdnJs != null && path.matches(CDN_PATH_RE)) {
                    view.evaluateJavascript(cdnJs + "\n;void 0;", null);
                }
                view.evaluateJavascript(contentJs + "\n;void 0;", null);
                consoleHook(view);
            } else if (value.contains("wait")) {
                retry(view);
            }
        });
    }

    private void retry(WebView view) {
        if (injectAttempt++ > 60) return;
        ui.postDelayed(() -> {
            if (!isFinishing() && web == view) inject(view);
        }, 30);
    }

    /** 注入后再挂一段桥，方便 adb logcat 里直接看到 MARGIN 有没有接管成功 */
    private void consoleHook(WebView view) {
        ui.postDelayed(() -> view.evaluateJavascript(
                "console.log('[zb] margin-root=' + !!document.getElementById('margin-root')"
                        + " + ' nodes=' + document.querySelectorAll('*').length)", null), 1200);
        ui.postDelayed(() -> view.evaluateJavascript(MOBILE_PATCH_JS, null), 900);
        ui.postDelayed(() -> view.evaluateJavascript(PORTRAIT_PATCH_JS, null), 1000);
    }

    // ---------------------------------------------------------------- assets

    private String readAsset(String name) {
        // 不用 in.available() 当长度：assets 里它只是"估计值"，压缩过的大文件会读不全
        try (InputStream in = getAssets().open(name)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream(64 * 1024);
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    private WebResourceResponse assetResponse(String rel) {
        if (rel.isEmpty()) rel = "manifest.json";
        if (rel.contains("..")) return null;
        try {
            InputStream in = getAssets().open(ASSET_DIR + rel);
            WebResourceResponse res = new WebResourceResponse(mimeOf(rel), encodingOf(rel), in);
            Map<String, String> headers = new HashMap<>();
            // 资源由当前 origin 提供（location.origin + /__margin__/），同源；
            // CORS 头是给 space / t / message 这些子域跳转后跨 origin 取的场景兜底
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Cache-Control", "public, max-age=600");
            res.setResponseHeaders(headers);
            return res;
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8",
                    new ByteArrayInputStream("not found".getBytes(StandardCharsets.UTF_8)));
        }
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    /** 文本资源给 utf-8，二进制必须给 null，否则字体解码会坏 */
    private static String encodingOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".js") || p.endsWith(".mjs") || p.endsWith(".css")
                || p.endsWith(".json") || p.endsWith(".html") || p.endsWith(".htm")
                || p.endsWith(".svg")) {
            return "utf-8";
        }
        return null;
    }

    // ---------------------------------------------------------------- 界面

    private void applyStatusBarInset() {
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                top = insets.getInsets(WindowInsets.Type.statusBars()).top;
            } else {
                top = insets.getSystemWindowInsetTop();
            }
            v.setPadding(0, top, 0, 0);
            return insets;
        });
    }

    private void applyImmersive(boolean on) {
        if (on) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                getWindow().setDecorFitsSystemWindows(false);
                getWindow().getInsetsController().hide(WindowInsets.Type.systemBars());
            } else {
                getWindow().getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }
            root.setPadding(0, 0, 0, 0);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                getWindow().setDecorFitsSystemWindows(true);
                getWindow().getInsetsController().show(WindowInsets.Type.systemBars());
            } else {
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            }
            applyStatusBarInset();
            root.requestApplyInsets();
        }
    }

    private void addFloatingButton() {
        int size = dp(44);
        TextView tv = new TextView(this);
        tv.setText("≡");
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        tv.setTextColor(Color.parseColor("#E8C46A"));
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        tv.setGravity(Gravity.CENTER);

        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(Color.parseColor("#CC141416"));
        bg.setStroke(dp(1), Color.parseColor("#40E8C46A"));
        tv.setBackground(bg);
        tv.setElevation(dp(6));
        tv.setAlpha(0.9f);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(size, size);
        lp.gravity = Gravity.BOTTOM | Gravity.END;
        lp.setMargins(0, 0, dp(14), dp(22));
        tv.setOnClickListener(this::showMenu);
        fab = tv;
        root.addView(fab, lp);
    }

    private void showMenu(View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add(0, 1, 0, "刷新");
        menu.getMenu().add(0, 2, 1, "后退");
        menu.getMenu().add(0, 3, 2, "前进");
        menu.getMenu().add(0, 4, 3, "回到首页");
        menu.getMenu().add(0, 5, 4, "正文字号 +");
        menu.getMenu().add(0, 6, 5, "正文字号 −");
        menu.getMenu().add(0, 7, 6, "关于");

        menu.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1:
                    web.reload();
                    return true;
                case 2:
                    if (web.canGoBack()) web.goBack();
                    return true;
                case 3:
                    if (web.canGoForward()) web.goForward();
                    return true;
                case 4:
                    web.loadUrl(HOME_URL);
                    return true;
                case 5:
                    bumpTextZoom(10);
                    return true;
                case 6:
                    bumpTextZoom(-10);
                    return true;
                case 7:
                    about();
                    return true;
                default:
                    return false;
            }
        });
        menu.show();
    }

    private void bumpTextZoom(int delta) {
        SharedPreferences sp = getSharedPreferences(PREF, MODE_PRIVATE);
        int zoom = Math.max(70, Math.min(160, sp.getInt("textZoom", 100) + delta));
        sp.edit().putInt("textZoom", zoom).apply();
        web.getSettings().setTextZoom(zoom);
        toast("正文字号 " + zoom + "%");
    }

    private void about() {
        new AlertDialog.Builder(this)
                .setTitle("zerobili")
                .setMessage("版本 " + versionName() + "\n\n"
                        + "加载真实 bilibili.com，界面由 MARGIN 接管。\n"
                        + "登录态、播放、弹幕、评论全部走 B 站原生能力，数据只存在本机。\n\n"
                        + "MARGIN 原作者：jiuyang5354（bilibili-margin）\n"
                        + "本项目是独立客户端，与哔哩哔哩官方无关。")
                .setPositiveButton("好", null)
                .show();
    }

    private String versionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "0.1.0";
        }
    }

    private boolean isBiliHost(String url) {
        try {
            String host = android.net.Uri.parse(url).getHost();
            if (host == null) return false;
            return host.equals("bilibili.com") || host.endsWith(".bilibili.com")
                    || host.endsWith(".hdslb.com") || host.endsWith(".biliapi.net");
        } catch (Exception e) {
            return false;
        }
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    private int dp(int v) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }
}
