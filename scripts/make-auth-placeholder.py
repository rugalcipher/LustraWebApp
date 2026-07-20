"""Generate the TEMPORARY auth-background placeholder masters.

This exists only so the auth background system has something on-brand to render
until the real artwork (a woman posed elegantly, beckoning) is produced. It is
deliberately abstract — a noir field, a rose-gold rim light and a soft seated
silhouette — and carries a small "PLACEHOLDER" mark so nobody mistakes it for
final art.

    python scripts/make-auth-placeholder.py

Writes:
    assets/other/auth.webp          (16:9  — desktop / tablet)
    assets/other/auth-mobile.webp   (9:16  — phones)

To replace with the real image, just overwrite those two masters and run
`npm run images`. Do NOT re-run this script afterwards, or it will overwrite the
real artwork with the placeholder again.
"""

import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "other")

NOIR = (11, 11, 13)
ROSE = (184, 135, 107)
LIGHT_ROSE = (216, 171, 145)


def _vertical_wash(size, focus):
    """Noir base with a soft warm pool of light behind the figure."""
    w, h = size
    base = Image.new("RGB", size, NOIR)
    glow = Image.new("L", size, 0)
    d = ImageDraw.Draw(glow)
    cx, cy = int(w * focus[0]), int(h * focus[1])
    r = int(max(w, h) * 0.55)
    for i in range(28, 0, -1):
        rr = int(r * i / 28)
        d.ellipse([cx - rr, cy - int(rr * 0.85), cx + rr, cy + int(rr * 0.85)], fill=int(70 * (1 - i / 28)))
    glow = glow.filter(ImageFilter.GaussianBlur(max(w, h) // 18))
    warm = Image.new("RGB", size, (58, 34, 26))
    return Image.composite(warm, base, glow)


def _figure(size, focus, scale):
    """A soft seated silhouette with one arm raised — a suggestion, not a person."""
    w, h = size
    layer = Image.new("L", size, 0)
    d = ImageDraw.Draw(layer)
    cx, cy = int(w * focus[0]), int(h * focus[1])
    u = int(min(w, h) * scale)  # body unit

    # torso
    d.ellipse([cx - int(u * 0.42), cy - int(u * 0.15), cx + int(u * 0.42), cy + int(u * 1.5)], fill=210)
    # head
    d.ellipse([cx - int(u * 0.21), cy - int(u * 0.72), cx + int(u * 0.21), cy - int(u * 0.24)], fill=225)
    # hair fall
    d.ellipse([cx - int(u * 0.34), cy - int(u * 0.66), cx + int(u * 0.05), cy + int(u * 0.55)], fill=200)
    # raised forearm + beckoning hand, angled toward the viewer
    d.line([(cx + int(u * 0.3), cy + int(u * 0.35)), (cx + int(u * 0.72), cy - int(u * 0.42))], fill=205, width=int(u * 0.17))
    d.ellipse([cx + int(u * 0.6), cy - int(u * 0.62), cx + int(u * 0.9), cy - int(u * 0.3)], fill=215)
    # seated legs sweeping away
    d.line([(cx - int(u * 0.1), cy + int(u * 1.35)), (cx - int(u * 1.15), cy + int(u * 1.95))], fill=200, width=int(u * 0.3))

    layer = layer.filter(ImageFilter.GaussianBlur(u // 22))
    return layer


def build(size, focus, scale, path):
    w, h = size
    img = _vertical_wash(size, focus)
    mask = _figure(size, focus, scale)

    # Dark silhouette against the warm pool...
    dark = Image.new("RGB", size, (7, 7, 9))
    img = Image.composite(dark, img, mask.point(lambda v: int(v * 0.88)))

    # ...with a rose-gold rim light down one edge (mask minus a shifted copy).
    shifted = Image.new("L", size, 0)
    shifted.paste(mask, (-int(min(w, h) * scale * 0.09), -int(min(w, h) * scale * 0.05)))
    rim = Image.eval(ImageChops.subtract(mask, shifted), lambda v: min(255, int(v * 1.5)))
    rim = rim.filter(ImageFilter.GaussianBlur(max(w, h) // 260))
    img = Image.composite(Image.new("RGB", size, LIGHT_ROSE), img, rim.point(lambda v: int(v * 0.55)))

    # Corner vignette
    vig = Image.new("L", size, 0)
    dv = ImageDraw.Draw(vig)
    dv.ellipse([-w * 0.25, -h * 0.25, w * 1.25, h * 1.25], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(max(w, h) // 12))
    img = Image.composite(img, Image.new("RGB", size, NOIR), vig)

    # Discreet placeholder mark
    d = ImageDraw.Draw(img)
    d.text((int(w * 0.04), int(h * 0.94)), "PLACEHOLDER  ·  replace assets/other/auth*.webp", fill=(78, 66, 60))

    img.save(path, format="WEBP", quality=88, method=6)
    print(f"{os.path.basename(path):26} {size[0]}x{size[1]}  {os.path.getsize(path)//1024} KB")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    # Desktop: figure sits right-of-centre so the centred auth card never covers her.
    build((2560, 1440), (0.70, 0.46), 0.30, os.path.join(OUT, "auth.webp"))
    # Phone: figure centred and lower, so the card floats above her.
    build((1440, 2560), (0.54, 0.44), 0.26, os.path.join(OUT, "auth-mobile.webp"))
