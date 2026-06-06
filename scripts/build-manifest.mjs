// Scans public/assets/layers/<Category>/*.png, generates downscaled thumbnails
// via sharp, and writes public/manifest.json. Run by predev/prebuild.
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CANVAS, CATEGORIES, TEXT_FIELDS } from './categories.config.mjs';

const THUMB_WIDTH = 240;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// NOTE: served under /art/ (NOT /assets/) because Vite's dev server reserves
// the /assets/ URL prefix (default build.assetsDir) and shadows public/assets/**.
const LAYERS_DIR = path.join(ROOT, 'public', 'art', 'layers');
const THUMBS_DIR = path.join(ROOT, 'public', 'art', 'thumbnails');
const MANIFEST_PATH = path.join(ROOT, 'public', 'manifest.json');
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

async function listPngs(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((f) => f.toLowerCase().endsWith('.png')).sort();
}

async function isStale(src, dst) {
  if (!existsSync(dst)) return true;
  const [s, d] = await Promise.all([stat(src), stat(dst)]);
  return s.mtimeMs > d.mtimeMs;
}

async function main() {
  const categories = [];
  let optionCount = 0;

  for (const cat of CATEGORIES) {
    const dir = path.join(LAYERS_DIR, cat.id);
    const files = await listPngs(dir);
    if (cat.required && files.length === 0) {
      console.warn(`!  required category "${cat.id}" has no PNGs in ${path.relative(ROOT, dir)}`);
    }
    const options = [];
    for (const file of files) {
      const id = path.basename(file, '.png');
      if (!PASCAL.test(id)) console.warn(`!  non-PascalCase asset name: ${cat.id}/${file}`);
      const srcPath = path.join(dir, file);
      const thumbDir = path.join(THUMBS_DIR, cat.id);
      const thumbPath = path.join(thumbDir, file);
      await mkdir(thumbDir, { recursive: true });
      if (await isStale(srcPath, thumbPath)) {
        await sharp(srcPath).resize({ width: THUMB_WIDTH }).png().toFile(thumbPath);
      }
      options.push({
        id,
        src: `/art/layers/${cat.id}/${file}`,
        thumb: `/art/thumbnails/${cat.id}/${file}`,
      });
      optionCount += 1;
    }
    categories.push({
      id: cat.id,
      label: cat.label,
      select: cat.select,
      ...(cat.required ? { required: true } : {}),
      ...(cat.fixed ? { fixed: true } : {}),
      options,
    });
  }

  const manifest = { canvas: CANVAS, categories, textFields: TEXT_FIELDS };
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `ok manifest: ${categories.length} categories, ${optionCount} options -> ${path.relative(ROOT, MANIFEST_PATH)}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
