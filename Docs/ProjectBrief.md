# Project Brief — ID-Card Maker

A starting-context document for Claude Code. Read this first, then `docs/ArtistSpec.md` for the full asset/layer spec.

---

## What we're building

A **static web "ID-card maker"**: users assemble a custom ID card from interchangeable art layers and a few typed text fields, then download the result as a PNG to print and stick on their belongings (in case they get lost). It's Picrew-style, but the only thing being customized is the card — not a full character creator.

Reference proof-of-concept: a hand-drawn pink ID card with a portrait window, labels (Name, Birthday, Class, Nationality), a barcode, badge icons, and decorative stickers.

---

## Stack & constraints

- **React + Vite.** No backend, no database, no accounts.
- Host as a static site (Vercel / Netlify / GitHub Pages).
- Keep it minimal — the whole app is a layered-PNG compositor with editable text and an export button.

---

## Architecture

- The card is a **stack of full-canvas transparent PNGs** drawn at position (0,0). Because every asset is authored on the same canvas with correct placement baked in, **stacking requires zero positioning code** — just z-order.
- A **`manifest.json`** drives everything: it lists categories, their options (id + file path), whether each category is single- or multi-select, and the text fields. Adding a new asset = drop the PNG in its folder + add one manifest line. **Code should not need to change to add assets.**
- **Text fields** (name, birthday, etc.) are rendered by the app *on top of* the card chrome — the art only contains the fixed labels, never the typed values.
- **Export**: flatten the card div to PNG with `html-to-image` (`toPng`, `pixelRatio: 2`). If font/sharpness issues arise, fall back to manual `<canvas>` redraw.

### Performance (4K assets)

- Canvas is **3840 × 2420** (4K width at ID-card proportions, ratio 1.586:1). Full-canvas transparent PNGs are large.
- Mitigate on the build side: a build step **auto-generates downscaled thumbnails** (so selection buttons never load 4K files) and the app **lazy-loads** full-res layers only when selected. Artists deliver only the full-res masters.

---

## Canvas spec (summary — full detail in ArtistSpec.md)

| Property           | Value                           |
| ------------------ | ------------------------------- |
| Dimensions         | 3840 × 2420 px (every asset)    |
| Aspect ratio       | 1.586 : 1 (ISO ID-1 card shape) |
| Color mode         | RGB / sRGB, 8-bit               |
| Background         | Transparent                     |
| Trim corner radius | ~140 px                         |
| Bleed              | ~90 px past trim                |
| Safe zone          | ~90 px inside trim              |

### Layer stack (back → front)

`CardBase` → `PhotoBackdrop` → `BodyBase` → `Clothes` → `HairBack`* → `Face` → `HairFront` → `Glasses` → `Headwear`(multi) → `Badges`(multi) → `Stickers`(multi) → `CardChrome` (fixed: labels, barcode, frame, brackets) → user-typed text (rendered by app, topmost).
\* `HairBack` optional for v1.

---

## Naming scheme (project-wide)

**Asset PNGs, folders, components, and manifest IDs use PascalCase.**

- **Rule:** PascalCase *within* a part; a descriptor glues directly to the part it describes. The underscore `_` is used **sparingly** — only to separate two genuinely distinct parts (e.g. a combo/preset file), and a modifier must never cross the boundary.
  - Correct combo: `FaceBlue_HairLong.png` ("Blue" stays with Face, "Long" stays with Hair).
  - Wrong: `Face_BlueHairLong.png` ("Blue" drifted across the boundary).
- **Most assets are a single part → no underscore at all:**
  - `Hair/HairLong.png`, `Hair/HairShortBob.png`
  - `Face/FaceSmiling.png`, `Face/FaceBlush.png`
  - `Clothes/ClothesSchoolUniform.png`
  - `Stickers/StickerWatermelon.png`, `Stickers/StickerHeart.png`
- **Folders:** PascalCase, one per category (`Hair/`, `Face/`, `Clothes/`...).
- **Manifest IDs** mirror the filenames exactly (`HairLong`, `FaceSmiling`).

**Code conventions:**

- React components: PascalCase files + names (`CardEditor.jsx`, `LayerPicker.jsx`).
- Hooks / utils / other JS: camelCase (`useCardState.js`, `exportImage.js`).
- Constants: UPPER_SNAKE_CASE (`CANVAS_WIDTH = 3840`).

**Two constraints to respect:**

1. **Case sensitivity.** Deploy hosts run Linux (case-sensitive); local macOS/Windows are not. A wrong-case reference will pass locally and 404 in production. **Generate the manifest *from* the actual filenames** (build script) so names can't drift.
2. **npm package name** can't be PascalCase (npm forces lowercase). Keep it cosmetic: `idcardmaker` in `package.json`. It never appears in the asset pipeline.

---

## v1 simplifications (revisit later)

- `Face` = one full expression per option (eyes + brows + mouth + blush as a set), not mixable sub-parts.
- `Hair` = a single front layer (`HairBack` optional).
- Both can be split into more granular, mixable parts post-launch for more combinations.

---

## Open decision

- **Sharing:** v1 assumes download-to-print only (fully static). If link-sharing is wanted later, encode selections in the URL (`?name=...&hair=HairLong&...`) — still no backend. A public gallery would be the only thing needing a database (e.g. Supabase free tier).

---

## Suggested first task for Claude Code

> Read `docs/ProjectBrief.md` and `docs/ArtistSpec.md`, then scaffold the Vite + React app with placeholder CSS-drawn assets and a sample `manifest.json`, so the pick-layers / type-text / download-PNG mechanic works end-to-end. Use the naming scheme above. Real PNGs will be dropped into the category folders later.