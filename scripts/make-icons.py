#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从一张方图生成全部图标产物：

  build/icon.ico                        Windows 安装包 / exe 图标（多尺寸）
  build/icon.png                        512px 主图标
  android/app/src/main/res/mipmap-*/    各密度 legacy 图标
  android/app/src/main/res/mipmap-*/    自适应图标前景（透明底，金色发光）
  android/app/src/main/res/mipmap-*/    自适应图标背景（纯黑）
  docs/icon.png                         README / 仓库头像

用法：
  python scripts/make-icons.py [源图路径]
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    ROOT, "build", "icon-src.jpg")
BG = (10, 10, 11)

# Android 各密度：legacy 图标边长、自适应前景/背景画布边长
DENSITIES = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}


def load_src(path):
    im = Image.open(path).convert("RGB")
    side = min(im.size)
    left = (im.width - side) // 2
    top = (im.height - side) // 2
    return im.crop((left, top, left + side, top + side))


def rounded(im, radius_ratio=0.22):
    """加圆角遮罩，返回 RGBA。"""
    side = im.width
    mask = Image.new("L", (side * 4, side * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, side * 4 - 1, side * 4 - 1), radius=int(side * 4 * radius_ratio),
        fill=255)
    mask = mask.resize((side, side), Image.LANCZOS)
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def cut_background(im, chroma_gain=1.55, hi_floor=150, hi_gain=3.2):
    """
    抠掉深色背景，只留下金色主体与它的辉光。

    判据不用亮度——背景里那层灰雾亮度不低，按亮度抠会抠出一片白渣。
    改用色度（max-min）：金色是强饱和的，灰雾饱和度接近 0；再叠一条
    「很亮 → 视为高光」的辅助项，保住金面上接近白的高光。
    """
    rgb = im.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    alpha = Image.new("L", (w, h))
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            chroma = max(r, g, b) - min(r, g, b)
            luma = (r * 299 + g * 587 + b * 114) // 1000
            a = chroma * chroma_gain + max(0, luma - hi_floor) * hi_gain
            ap[x, y] = 0 if a < 8 else (255 if a > 255 else int(a))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def fit_center(im, canvas, ratio):
    """把图按最长边占 ratio 等比缩放后居中放进画布（不改纵横比）。"""
    box = int(canvas * ratio)
    scale = box / max(im.size)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    inner = im.resize(size, Image.LANCZOS)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.paste(inner, ((canvas - size[0]) // 2, (canvas - size[1]) // 2), inner)
    return out


def trim(im, floor=8):
    """裁掉四周的透明/纯黑留白。"""
    box = im.convert("RGB").convert("L").point(lambda v: 255 if v > floor else 0).getbbox()
    return im.crop(box) if box else im


def trim_alpha(im, thr=40, pad=0.04):
    """
    按 alpha 裁掉透明留白。

    不能直接用 getbbox()：JPEG 在四角留下的噪声会让 alpha 有 1~8 的残值，
    边界被撑到整张图，主体于是被缩得很小。先按阈值二值化再取框。
    """
    mask = im.getchannel("A").point(lambda v: 255 if v > thr else 0)
    box = mask.getbbox()
    if not box:
        return im
    pad_px = int(max(im.size) * pad)
    l, t, r, b = box
    return im.crop((max(0, l - pad_px), max(0, t - pad_px),
                    min(im.width, r + pad_px), min(im.height, b + pad_px)))


def main():
    src_path = SRC
    if not os.path.exists(src_path):
        for cand in ("icon-src.jpg", "icon-src.png"):
            p = os.path.join(ROOT, "build", cand)
            if os.path.exists(p):
                src_path = p
                break
    if not os.path.exists(src_path):
        sys.exit(f"找不到源图：{src_path}")

    src = load_src(src_path)
    print(f"源图 {src_path}  {src.size}")

    # ---------------- Windows ----------------
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    base = rounded(src, 0.22)
    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    base.resize((256, 256), Image.LANCZOS).save(
        os.path.join(ROOT, "build", "icon.ico"),
        sizes=[(s, s) for s in ico_sizes])
    base.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "build", "icon.png"))
    base.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ROOT, "build", "icon-1024.png"))
    print("  build/icon.ico (16..256)  build/icon.png (512)  build/icon-1024.png")

    # ---------------- docs ----------------
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    base.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "docs", "icon.png"))
    print("  docs/icon.png")

    # ---------------- Android ----------------
    fg_src = trim_alpha(cut_background(src))
    for name, (legacy, adaptive) in DENSITIES.items():
        res = os.path.join(ROOT, "android", "app", "src", "main", "res", f"mipmap-{name}")
        os.makedirs(res, exist_ok=True)

        rounded(src, 0.22).resize((legacy, legacy), Image.LANCZOS).save(
            os.path.join(res, "ic_launcher.png"))
        rounded(src, 0.22).resize((legacy, legacy), Image.LANCZOS).save(
            os.path.join(res, "ic_launcher_round.png"))  # 圆角够近似，系统会再裁圆

        # 自适应图标：安全区 66/108，视觉内容取 62% 左右，给发光留边
        fit_center(fg_src, adaptive, 0.64).save(
            os.path.join(res, "ic_launcher_foreground.png"))
        Image.new("RGBA", (adaptive, adaptive), BG + (255,)).save(
            os.path.join(res, "ic_launcher_background.png"))
        # 单色图标（Android 13 主题图标）
        mono = Image.new("RGBA", (adaptive, adaptive), (255, 255, 255, 0))
        fg = fit_center(fg_src, adaptive, 0.64)
        white = Image.new("RGBA", fg.size, (255, 255, 255, 255))
        white.putalpha(fg.getchannel("A"))
        mono.paste(white, (0, 0), white)
        mono.save(os.path.join(res, "ic_launcher_monochrome.png"))

    print("  android .../mipmap-*  legacy + adaptive(fore/back/mono)")


if __name__ == "__main__":
    main()
