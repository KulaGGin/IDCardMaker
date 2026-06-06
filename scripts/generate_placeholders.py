#!/usr/bin/env python3
"""Generate placeholder layer assets for the ID-Card Maker.

Every asset is a full-canvas (3840 x 2420) transparent PNG holding a single
colored primitive at baked-in coordinates, so the app can stack them by z-order
alone. Shapes are drawn at SUPERSAMPLE x then downscaled (LANCZOS) so curved /
rounded edges come out anti-aliased (Pillow's draw routines are not).

Each selectable category gets VARIANTS (10) colour options named <Category>NN
(01..10). Colours come from a shared PALETTE, rotated per category so each
category's default (01) is a different hue (keeps the default avatar legible).
Multi-select categories spread their 10 options across different positions so
several can be toggled on at once. CardChrome is fixed (one frame overlay).

These are throwaway stand-ins: real hand-drawn art replaces them later by
dropping PNGs into the same category folders and rerunning `npm run assets`.

Usage:
    python scripts/generate_placeholders.py            # write all PNGs
    python scripts/generate_placeholders.py --preview  # also write scripts/preview.png
"""
from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw

CANVAS = (3840, 2420)          # (w, h) for every asset
SUPERSAMPLE = 2                # render at Nx, downscale for clean edges
REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = REPO_ROOT / "public" / "art" / "layers"  # /art/ not /assets/ (Vite dev reserves /assets/)

TRANSPARENT = (0, 0, 0, 0)
S = SUPERSAMPLE
FACE_CX = 990  # horizontal mirror axis (face center) for paired features: ears, eyes, brows

VARIANTS = 10                  # colour options per selectable category
CHROME_INK = "#5A3A4A"

# Shared 10-colour palette (name, hex). Rotated per category for distinct defaults.
PALETTE = [
    ("Red", "#E0566B"),
    ("Orange", "#E8924A"),
    ("Yellow", "#F2C14E"),
    ("Green", "#7AC74F"),
    ("Teal", "#4FC4B0"),
    ("Blue", "#4A8FE0"),
    ("Indigo", "#5B5BD6"),
    ("Purple", "#A86FD6"),
    ("Pink", "#E879A6"),
    ("Brown", "#8A5A3B"),
]


def rgba(h: str, a: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# --- Category table (z-order back -> front) --------------------------------
# Each row: (id, kind, shape, geom_fn)
#   kind  "single" -> VARIANTS colour options at one fixed position
#         "multi"  -> VARIANTS options laid out at different positions
#         "fixed"  -> a single option (the chrome overlay)
#   shape "rect"/"rrect" -> geom {"box": (x, y, w, h), "r": radius}
#         "ellipse"      -> geom {"center": (cx, cy), "radii": (rx, ry)}
#         "circle"       -> geom {"center": (cx, cy), "r": radius}
#         "chrome"       -> geom None
#   add "mirror": True to a geom to also draw its horizontal mirror across FACE_CX.
#   geom_fn(j) gets the 0-based option index; single/fixed ignore it, multi
#   uses it to spread the 10 options out.
CATEGORIES = [
    ("CardBase",      "single", "rrect",   lambda j: {"box": (90, 90, 3660, 2240), "r": 140}),
    ("PhotoBackdrop", "single", "rect",    lambda j: {"box": (240, 360, 1500, 1700)}),
    ("BodyBase",      "single", "rrect",   lambda j: {"box": (440, 1520, 1100, 540), "r": 120}),
    ("Clothes",       "single", "rect",    lambda j: {"box": (500, 1580, 980, 480)}),
    ("HairBack",      "single", "rect",    lambda j: {"box": (560, 560, 860, 920)}),
    ("Ears",          "single", "ellipse", lambda j: {"center": (680, 1090), "radii": (70, 120), "mirror": True}),
    ("Face",          "single", "ellipse", lambda j: {"center": (990, 1080), "radii": (320, 400)}),
    ("HairFront",     "single", "rect",    lambda j: {"box": (620, 600, 740, 420)}),
    ("Eyes",          "single", "ellipse", lambda j: {"center": (870, 1040), "radii": (55, 38), "mirror": True}),
    ("Brows",         "single", "rrect",   lambda j: {"box": (800, 952, 140, 30), "r": 15, "mirror": True}),
    ("Nose",          "single", "rrect",   lambda j: {"box": (962, 1085, 56, 130), "r": 24}),
    ("Mouth",         "single", "rrect",   lambda j: {"box": (882, 1270, 216, 64), "r": 30}),
    ("Beard",         "single", "rrect",   lambda j: {"box": (760, 1330, 460, 200), "r": 90}),
    ("Glasses",       "single", "rrect",   lambda j: {"box": (740, 980, 500, 120), "r": 40}),
    ("Headwear",      "multi",  "rect",    lambda j: {"box": (600 + j * 82, 470, 64, 150)}),
    ("Badges",        "multi",  "circle",  lambda j: {"center": (380 + j * 148, 2190), "r": 64}),
    ("Stickers",      "multi",  "rect",    lambda j: {"box": (3540, 230 + j * 195, 160, 160)}),
    ("CardChrome",    "fixed",  "chrome",  lambda j: None),
]


def _draw_primitive(d: ImageDraw.ImageDraw, shape: str, geom: dict, fill, flip: bool) -> None:
    if shape in ("rect", "rrect"):
        x, y, w, h = geom["box"]
        if flip:
            x = 2 * FACE_CX - x - w
        box = [x * S, y * S, (x + w) * S, (y + h) * S]
        if shape == "rrect":
            d.rounded_rectangle(box, radius=geom.get("r", 0) * S, fill=fill)
        else:
            d.rectangle(box, fill=fill)
    elif shape == "ellipse":
        cx, cy = geom["center"]
        rx, ry = geom["radii"]
        if flip:
            cx = 2 * FACE_CX - cx
        d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)
    elif shape == "circle":
        cx, cy = geom["center"]
        r = geom["r"]
        if flip:
            cx = 2 * FACE_CX - cx
        d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=fill)
    else:
        raise ValueError(f"unknown shape: {shape}")


def draw_shape(d: ImageDraw.ImageDraw, shape: str, geom: dict, fill) -> None:
    """Draw a primitive (scaled by S); if geom['mirror'], also draw its mirror across FACE_CX."""
    _draw_primitive(d, shape, geom, fill, False)
    if geom.get("mirror"):
        _draw_primitive(d, shape, geom, fill, True)


def draw_chrome(d: ImageDraw.ImageDraw, ink) -> None:
    """Fixed card chrome: frame, photo-window bracket, label underlines, barcode."""
    # card frame (rounded-rect outline, inset from the card edge)
    d.rounded_rectangle([150 * S, 150 * S, 3690 * S, 2270 * S], radius=120 * S, outline=ink, width=16 * S)
    # portrait-window bracket
    d.rounded_rectangle([220 * S, 340 * S, 1760 * S, 2080 * S], radius=24 * S, outline=ink, width=12 * S)
    # four label underlines on the right panel (Name / Birthday / Class / Nationality)
    for y in (620, 940, 1260, 1580):
        d.rectangle([1980 * S, y * S, 3480 * S, (y + 16) * S], fill=ink)
    # barcode: deterministic vertical bars in x[1980, 3180], y[1820, 2120]
    rng = random.Random(7)
    x, x_end = 1980, 3180
    while x < x_end:
        bw = rng.choice([10, 14, 20, 26, 34])
        if x + bw > x_end:
            break
        d.rectangle([x * S, 1820 * S, (x + bw) * S, 2120 * S], fill=ink)
        x += bw + rng.choice([12, 16, 22])


def render(shape: str, geom, fill_hex: str) -> Image.Image:
    big = Image.new("RGBA", (CANVAS[0] * S, CANVAS[1] * S), TRANSPARENT)
    d = ImageDraw.Draw(big)
    if shape == "chrome":
        draw_chrome(d, rgba(fill_hex))
    else:
        draw_shape(d, shape, geom, rgba(fill_hex))
    out = big.resize(CANVAS, Image.Resampling.LANCZOS)
    big.close()
    return out


def options_for(k: int, cat) -> list[tuple[str, str]]:
    """Return [(name, hex)] for category at z-index k."""
    cid, kind = cat[0], cat[1]
    if kind == "fixed":
        return [("CardChromeDefault", CHROME_INK)]
    return [(f"{cid}{j + 1:02d}", PALETTE[(k + j) % len(PALETTE)][1]) for j in range(VARIANTS)]


def build_preview(path: Path) -> None:
    """Composite each single category's default (01) + the chrome (multi off by default)."""
    bg = Image.new("RGBA", CANVAS, (221, 221, 221, 255))
    for cat in CATEGORIES:
        cid, kind = cat[0], cat[1]
        if kind == "multi":
            continue
        name = "CardChromeDefault" if kind == "fixed" else f"{cid}01"
        p = OUT_ROOT / cid / f"{name}.png"
        if p.exists():
            with Image.open(p) as im:
                bg.alpha_composite(im.convert("RGBA"))
    w = 1200
    preview = bg.convert("RGB").resize((w, round(w / (CANVAS[0] / CANVAS[1]))), Image.Resampling.LANCZOS)
    preview.save(path)
    print(f"preview  -> {path.relative_to(REPO_ROOT)}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate placeholder layer PNGs.")
    ap.add_argument("--preview", action="store_true", help="also write scripts/preview.png")
    args = ap.parse_args()

    count = 0
    for k, cat in enumerate(CATEGORIES):
        cid, _kind, shape, geom_fn = cat
        out_dir = OUT_ROOT / cid
        out_dir.mkdir(parents=True, exist_ok=True)
        for old in out_dir.glob("*.png"):  # clear stale variants so the output is canonical
            old.unlink()
        for j, (name, color) in enumerate(options_for(k, cat)):
            img = render(shape, geom_fn(j), color)
            img.save(out_dir / f"{name}.png")
            img.close()
            count += 1
    print(f"wrote {count} PNGs across {len(CATEGORIES)} categories under {OUT_ROOT.relative_to(REPO_ROOT)}")

    if args.preview:
        build_preview(REPO_ROOT / "scripts" / "preview.png")


if __name__ == "__main__":
    main()
