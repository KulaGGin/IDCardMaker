import { unzipSync } from 'fflate';

const MAX_FILES = 400; // safety cap on images per pack
const THUMB_WIDTH = 240;

function stem(path) {
  return path.split('/').pop().replace(/\.png$/i, '');
}

function sanitizeId(s) {
  return s.replace(/[^A-Za-z0-9]/g, '') || 'Item';
}

// Downscale a PNG blob to a small thumbnail blob via <canvas> (keeps transparency).
function makeThumb(blob, width = THUMB_WIDTH) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, width / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('toBlob failed'))), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

// Parse a .zip File into per-category image records.
//   knownCategoryIds:  iterable of valid category ids
//   existingIdsByCat:  { [categoryId]: Set<string> } ids already taken (built-ins + prior uploads)
// Returns { records: [{ categoryId, id, full:Blob, thumb:Blob }], warnings: string[] }.
export async function parseUserPack(file, knownCategoryIds, existingIdsByCat = {}) {
  const known = new Set(knownCategoryIds);
  const warnings = [];
  let entries;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    entries = unzipSync(buf, {
      filter: (f) => /\.png$/i.test(f.name) && !f.name.startsWith('__MACOSX/'),
    });
  } catch (e) {
    return { records: [], warnings: [`Could not read zip: ${e.message}`] };
  }

  const used = {}; // categoryId -> Set of taken ids
  for (const [cat, set] of Object.entries(existingIdsByCat)) used[cat] = new Set(set);

  const records = [];
  for (const rawName of Object.keys(entries)) {
    const name = rawName.replace(/\\/g, '/'); // normalize backslash-separated (Windows-zipped) paths
    const parts = name.split('/').filter(Boolean);
    if (parts.length < 2) continue; // need <Category>/<file>.png
    const categoryId = parts[parts.length - 2]; // parent folder = category
    if (!known.has(categoryId)) {
      warnings.push(`Skipped "${name}" — unknown category "${categoryId}".`);
      continue;
    }
    if (records.length >= MAX_FILES) {
      warnings.push(`Reached the ${MAX_FILES}-image limit; remaining files skipped.`);
      break;
    }
    const full = new Blob([entries[rawName]], { type: 'image/png' });
    let thumb;
    try {
      thumb = await makeThumb(full);
    } catch {
      thumb = full; // fall back to the full image as its own thumbnail
    }
    const set = (used[categoryId] ||= new Set());
    const base = sanitizeId(stem(name));
    let id = base;
    let n = 2;
    while (set.has(id)) id = `${base}-${n++}`;
    set.add(id);
    records.push({ categoryId, id, full, thumb });
  }

  if (!records.length && !warnings.length) {
    warnings.push('No PNGs found inside a known category folder.');
  }
  return { records, warnings };
}

// Build a manifest option (with object URLs) from a stored record.
export function optionFromRecord(rec) {
  return {
    id: rec.id,
    src: URL.createObjectURL(rec.full),
    thumb: URL.createObjectURL(rec.thumb),
    userUploaded: true,
  };
}

// Merge user options (grouped by category id) into a manifest (augments built-ins).
export function mergeManifest(manifest, userOptions) {
  if (!manifest || !userOptions || Object.keys(userOptions).length === 0) return manifest;
  return {
    ...manifest,
    categories: manifest.categories.map((c) =>
      userOptions[c.id]?.length ? { ...c, options: [...c.options, ...userOptions[c.id]] } : c
    ),
  };
}
