#!/usr/bin/env python3
"""Generate placeholder layer assets for the ID-Card Maker.

Every asset is a full-canvas (3840 x 2420) transparent PNG holding a single
colored primitive at baked-in coordinates, so the app can stack them by z-order
alone. Shapes are drawn at SUPERSAMPLE x then downscaled (LANCZOS) so curved /
rounded edges come out anti-aliased (Pillow's draw routines are not).

These are throwaway stand-ins: real hand-drawn art replaces them later by
dropping PNGs of the same name into the same category folders.

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
OUT_ROOT = REPO_ROOT / "public" / "assets" / "layers"

TRANSPARENT = (0, 0, 0, 0)
S = SUPERSAMPLE


def rgba(h: str, a: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


# --- Asset table -----------------------------------------------------------
# Each row: (category, name, shape, geom, fill_hex)
#   shape "rect"/"rrect": geom = {"box": (x, y, w, h), "r": corner_radius}
#   shape "ellipse":      geom = {"center": (cx, cy), "radii": (rx, ry)}
#   shape "circle":       geom = {"center": (cx, cy), "r": radius}
#   shape "chrome":       geom = None  (frame + label lines + barcode; fill = ink)
# Geometry is in 1x canvas pixels; scaled by SUPERSAMPLE at draw time.
ASSETS = [
    # ---- single-select: two color variants at the SAME position ----
    ("CardBase",      "CardBasePink",       "rrect",   {"box": (90, 90, 3660, 2240), "r": 140}, "#F7C5D0"),
    ("CardBase",      "CardBaseBlue",       "rrect",   {"box": (90, 90, 3660, 2240), "r": 140}, "#BBD3F2"),
    ("PhotoBackdrop", "PhotoBackdropCream", "rect",    {"box": (240, 360, 1500, 1700)},         "#FFE9A8"),
    ("PhotoBackdrop", "PhotoBackdropMint",  "rect",    {"box": (240, 360, 1500, 1700)},         "#CDEFD6"),
    ("BodyBase",      "BodyBaseWarm",       "rrect",   {"box": (440, 1520, 1100, 540), "r": 120}, "#E8B894"),
    ("BodyBase",      "BodyBaseTan",        "rrect",   {"box": (440, 1520, 1100, 540), "r": 120}, "#C98E6B"),
    ("Clothes",       "ClothesTeal",        "rect",    {"box": (500, 1580, 980, 480)},          "#7FC8B8"),
    ("Clothes",       "ClothesLavender",    "rect",    {"box": (500, 1580, 980, 480)},          "#C3A6E0"),
    ("HairBack",      "HairBackBrown",      "rect",    {"box": (560, 560, 860, 920)},           "#5A3D26"),
    ("HairBack",      "HairBackBlack",      "rect",    {"box": (560, 560, 860, 920)},           "#211F1E"),
    ("Face",          "FacePeach",          "ellipse", {"center": (990, 1080), "radii": (320, 400)}, "#FCE0C0"),
    ("Face",          "FaceTan",            "ellipse", {"center": (990, 1080), "radii": (320, 400)}, "#F6CBA6"),
    ("HairFront",     "HairFrontBrown",     "rect",    {"box": (620, 600, 740, 420)},           "#6B4A2F"),
    ("HairFront",     "HairFrontAuburn",    "rect",    {"box": (620, 600, 740, 420)},           "#C24B5A"),
    ("Glasses",       "GlassesBlack",       "rrect",   {"box": (740, 980, 500, 120), "r": 40},  "#2E2A28"),
    ("Glasses",       "GlassesBlue",        "rrect",   {"box": (740, 980, 500, 120), "r": 40},  "#2A6FB0"),
    # ---- multi-select: two options at DIFFERENT positions ----
    ("Headwear",      "HeadwearCapRed",     "rect",    {"box": (640, 460, 700, 160)},           "#E0556A"),
    ("Headwear",      "HeadwearBowBlue",    "rect",    {"box": (1240, 420, 260, 180)},          "#4A8FE0"),
    ("Badges",        "BadgeStarGold",      "circle",  {"center": (420, 2190), "r": 110},       "#FFD23F"),
    ("Badges",        "BadgeCheckGreen",    "circle",  {"center": (720, 2190), "r": 110},       "#7AC74F"),
    ("Stickers",      "StickerHeartPink",   "rect",    {"box": (3380, 260, 240, 240)},          "#FF7AA2"),
    ("Stickers",      "StickerStarCyan",    "rect",    {"box": (3380, 1780, 240, 240)},         "#62C2E0"),
    # ---- fixed: one overlay (frame + label underlines + barcode) ----
    ("CardChrome",    "CardChromeDefault",  "chrome",  None,                                    "#5A3A4A"),
]

# z-order (back -> front) for the --preview composite: variant A of each
# single-select, both multi options, then the chrome overlay on top.
PREVIEW_ORDER = [
    ("CardBase", "CardBasePink"),
    ("PhotoBackdrop", "PhotoBackdropCream"),
    ("BodyBase", "BodyBaseWarm"),
    ("Clothes", "ClothesTeal"),
    ("HairBack", "HairBackBrown"),
    ("Face", "FacePeach"),
    ("HairFront", "HairFrontBrown"),
    ("Glasses", "GlassesBlack"),
    ("Headwear", "HeadwearCapRed"),
    ("Headwear", "HeadwearBowBlue"),
    ("Badges", "BadgeStarGold"),
    ("Badges", "BadgeCheckGreen"),
    ("Stickers", "StickerHeartPink"),
    ("Stickers", "StickerStarCyan"),
    ("CardChrome", "CardChromeDefault"),
]


def draw_shape(d: ImageDraw.ImageDraw, shape: str, geom: dict, fill) -> None:
    """Draw one primitive on the supersampled canvas (coords scaled by S)."""
    if shape in ("rect", "rrect"):
        x, y, w, h = geom["box"]
        box = [x * S, y * S, (x + w) * S, (y + h) * S]
        if shape == "rrect":
            d.rounded_rectangle(box, radius=geom.get("r", 0) * S, fill=fill)
        else:
            d.rectangle(box, fill=fill)
    elif shape == "ellipse":
        cx, cy = geom["center"]
        rx, ry = geom["radii"]
        d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)
    elif shape == "circle":
        cx, cy = geom["center"]
        r = geom["r"]
        d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=fill)
    else:
        raise ValueError(f"unknown shape: {shape}")


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


def build_preview(path: Path) -> None:
    bg = Image.new("RGBA", CANVAS, (221, 221, 221, 255))
    for cat, name in PREVIEW_ORDER:
        with Image.open(OUT_ROOT / cat / f"{name}.png") as im:
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
    for cat, name, shape, geom, fill in ASSETS:
        out_dir = OUT_ROOT / cat
        out_dir.mkdir(parents=True, exist_ok=True)
        img = render(shape, geom, fill)
        img.save(out_dir / f"{name}.png")
        img.close()
        count += 1
    print(f"wrote {count} PNGs under {OUT_ROOT.relative_to(REPO_ROOT)}")

    if args.preview:
        build_preview(REPO_ROOT / "scripts" / "preview.png")


if __name__ == "__main__":
    main()
