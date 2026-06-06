import { toPng } from 'html-to-image';
import {
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
  EXPORT_FILENAME,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TEXT_INK,
} from './constants.js';

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function waitForAssets(node) {
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  );
}

function selectedIds(cat, selections) {
  const val = selections[cat.id];
  if (cat.select === 'multi') return Array.isArray(val) ? val : [];
  return val ? [val] : [];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Deterministic fallback if html-to-image hits font/sharpness issues.
async function exportViaCanvas({ manifest, selections, text, filename }) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  for (const cat of manifest.categories) {
    for (const id of selectedIds(cat, selections)) {
      const opt = cat.options.find((o) => o.id === id);
      if (!opt) continue;
      // eslint-disable-next-line no-await-in-loop
      const img = await loadImage(opt.src);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
  ctx.fillStyle = TEXT_INK;
  ctx.textBaseline = 'top';
  for (const f of manifest.textFields) {
    const value = (text[f.id] ?? '').trim();
    if (!value) continue;
    ctx.textAlign = f.align === 'center' ? 'center' : f.align === 'right' ? 'right' : 'left';
    ctx.font = `600 ${f.fontSize}px Quicksand, system-ui, sans-serif`;
    ctx.fillText(value, f.x, f.y);
  }
  triggerDownload(canvas.toDataURL('image/png'), `${filename}.png`);
}

export async function downloadCard({ node, manifest, selections, text, filename = EXPORT_FILENAME }) {
  const safe = (filename || EXPORT_FILENAME).toString().trim() || EXPORT_FILENAME;
  try {
    await waitForAssets(node);
    const pixelRatio = EXPORT_WIDTH / node.clientWidth;
    const opts = {
      pixelRatio,
      canvasWidth: EXPORT_WIDTH,
      canvasHeight: EXPORT_HEIGHT,
      cacheBust: true,
    };
    await toPng(node, opts); // warm-up: html-to-image can miss images on the first pass
    const dataUrl = await toPng(node, opts);
    triggerDownload(dataUrl, `${safe}.png`);
  } catch (err) {
    console.warn('html-to-image export failed; using canvas fallback.', err);
    await exportViaCanvas({ manifest, selections, text, filename: safe });
  }
}
