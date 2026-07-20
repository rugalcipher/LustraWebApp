"""Regenerate the responsive marketing/hero derivatives from the approved masters.

Masters (source of truth, never shipped to the browser):
    assets/other/{about,how-it-works,safety,talent}[-mobile].webp  -> src/assets/marketing/
    assets/home/home_{1..5}_{mobile,wide}.png                      -> public/home/

The marketing set lives under `src/assets/` so Vite content-hashes it: replacing
a master changes the emitted filename, which defeats browser/CDN caching of the
old bytes.

    python scripts/gen-marketing-images.py            # only what changed
    python scripts/gen-marketing-images.py --force    # everything

CHANGE DETECTION IS BY CONTENT HASH, NOT BY FILENAME EXISTENCE. Every master's
sha256 is recorded in `src/assets/marketing/.manifest.json` together with the
outputs it produced. A master whose bytes changed is rebuilt and its previous
outputs are deleted first, so a stale crop can never survive a re-run. The
companion `scripts/check-marketing-images.mjs` runs automatically before
`npm run build` and fails the build if a master no longer matches the manifest.

Requires Pillow (`pip install pillow`).
"""

import hashlib
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MARKETING_SRC = os.path.join(ROOT, "assets", "other")
MARKETING_OUT = os.path.join(ROOT, "src", "assets", "marketing")
MARKETING_NAMES = ["about", "how-it-works", "safety", "talent"]
MARKETING_WIDTHS = (768, 1200, 1600, 2200)
# Portrait (9:16) phone variants: `<name>-mobile.webp` in assets/other. Served
# below 560px via <picture>, so they only need phone-sized widths.
MARKETING_MOBILE_WIDTHS = (480, 720, 1080)

# Auth pages (login / register / forgot / reset) share one background mood image.
# It sits behind a scrim and is never the subject, so it needs fewer widths.
AUTH_OUT = os.path.join(ROOT, "src", "assets", "auth")
AUTH_NAMES = ["auth"]
AUTH_WIDTHS = (1200, 1800, 2560)
AUTH_MOBILE_WIDTHS = (480, 720, 1080)

# (set name, source dir, output dir, landscape widths, portrait widths)
SETS = (
    ("marketing", MARKETING_SRC, MARKETING_OUT, MARKETING_NAMES, MARKETING_WIDTHS, MARKETING_MOBILE_WIDTHS),
    ("auth", MARKETING_SRC, AUTH_OUT, AUTH_NAMES, AUTH_WIDTHS, AUTH_MOBILE_WIDTHS),
)

HERO_SRC = os.path.join(ROOT, "assets", "home")
HERO_OUT = os.path.join(ROOT, "public", "home")
HERO_WIDTHS = {"wide": (1080, 1440, 1672), "mobile": (640, 900)}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _manifest_path(out_dir):
    return os.path.join(out_dir, ".manifest.json")


def _load_manifest(out_dir):
    try:
        with open(_manifest_path(out_dir), encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def _save_manifest(out_dir, data):
    with open(_manifest_path(out_dir), "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
        fh.write("\n")


def _resize(im, width):
    height = round(im.height * width / im.width)
    return im.resize((width, height), Image.LANCZOS)


def _report(path):
    print("   %-30s %6d KB" % (os.path.basename(path), os.path.getsize(path) // 1024))


def _drop_stale(out_dir, outputs):
    """Delete a master's previous outputs so no old crop can linger."""
    for name in outputs:
        path = os.path.join(out_dir, name)
        if os.path.exists(path):
            os.remove(path)
            print(f"   removed stale {name}")


def build_set(label, src_dir, out_dir, names, widths, mobile_widths, force=False):
    os.makedirs(out_dir, exist_ok=True)
    manifest = _load_manifest(out_dir)
    changed = 0

    for name in names:
        for master_name, sizes, jpeg_width in (
            (f"{name}.webp", widths, 1600),
            (f"{name}-mobile.webp", mobile_widths, 720),
        ):
            master = os.path.join(src_dir, master_name)
            stem = master_name[: -len(".webp")]

            if not os.path.exists(master):
                if stem.endswith("-mobile"):
                    print(f"{stem}: no master supplied - skipping portrait variant")
                    continue
                raise SystemExit(f"Missing required master: {master}")

            digest = sha256(master)
            entry = manifest.get(stem)
            outputs_present = entry and all(
                os.path.exists(os.path.join(out_dir, o)) for o in entry.get("outputs", [])
            )
            if not force and entry and entry.get("sha256") == digest and outputs_present:
                print(f"{stem}: unchanged")
                continue

            if entry:
                _drop_stale(out_dir, entry.get("outputs", []))

            im = Image.open(master).convert("RGB")
            print(f"{stem}: master {im.size}  sha {digest[:12]}")
            outputs = []
            for w in sizes:
                if w > im.width:
                    continue
                out = os.path.join(out_dir, f"{stem}-{w}.webp")
                _resize(im, w).save(out, format="WEBP", quality=82, method=6)
                outputs.append(os.path.basename(out))
                _report(out)
            out = os.path.join(out_dir, f"{stem}.jpg")
            _resize(im, min(jpeg_width, im.width)).save(
                out, format="JPEG", quality=80, optimize=True, progressive=True
            )
            outputs.append(os.path.basename(out))
            _report(out)

            manifest[stem] = {"sha256": digest, "outputs": sorted(outputs)}
            changed += 1

    _save_manifest(out_dir, manifest)
    print(f"{label}: {changed} master(s) rebuilt\n")


def build_marketing(force=False):
    for label, src_dir, out_dir, names, widths, mobile_widths in SETS:
        build_set(label, src_dir, out_dir, names, widths, mobile_widths, force=force)


def build_hero():
    os.makedirs(HERO_OUT, exist_ok=True)
    for n in range(1, 6):
        for kind, widths in HERO_WIDTHS.items():
            im = Image.open(os.path.join(HERO_SRC, f"home_{n}_{kind}.png")).convert("RGB")
            for w in widths:
                out = os.path.join(HERO_OUT, f"home-{n}-{kind}-{w}.webp")
                _resize(im, min(w, im.width)).save(out, format="WEBP", quality=82, method=6)
                _report(out)
            out = os.path.join(HERO_OUT, f"home-{n}-{kind}.jpg")
            _resize(im, min(widths[0], im.width)).save(
                out, format="JPEG", quality=80, optimize=True, progressive=True
            )
            _report(out)
        im = Image.open(os.path.join(HERO_SRC, f"home_{n}_wide.png")).convert("RGB")
        out = os.path.join(HERO_OUT, f"home-{n}-preview.webp")
        _resize(im, 480).save(out, format="WEBP", quality=78, method=6)
        _report(out)


if __name__ == "__main__":
    args = set(sys.argv[1:])
    build_marketing(force="--force" in args)
    if "--hero" in args or "--force" in args:
        build_hero()
