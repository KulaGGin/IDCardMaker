// Readable, backendless sharing: state <-> URL query params.
//   single -> ?CardBase=CardBasePink
//   multi  -> ?Headwear=HeadwearCapRed,HeadwearBowBlue
//   text   -> ?name=Yuki (URL-encoded)

export function encodeStateToParams(manifest, selections, text) {
  const params = new URLSearchParams();
  for (const cat of manifest.categories) {
    if (cat.fixed) continue;
    const val = selections[cat.id];
    if (cat.select === 'multi') {
      if (Array.isArray(val) && val.length) params.set(cat.id, val.join(','));
    } else if (val) {
      params.set(cat.id, val);
    }
  }
  for (const field of manifest.textFields) {
    const v = (text[field.id] ?? '').trim();
    if (v) params.set(field.id, v);
  }
  return params;
}

export function parseParamsToState(manifest, search = window.location.search) {
  const params = new URLSearchParams(search);
  const selections = {};
  const text = {};
  let hasAny = false;

  for (const cat of manifest.categories) {
    const validIds = new Set(cat.options.map((o) => o.id));
    const raw = params.get(cat.id);
    if (cat.select === 'multi') {
      const picked = (raw ? raw.split(',') : []).filter((id) => validIds.has(id));
      selections[cat.id] = picked;
      if (raw) hasAny = true;
    } else if (cat.fixed) {
      selections[cat.id] = cat.options[0]?.id ?? null;
    } else if (raw && validIds.has(raw)) {
      selections[cat.id] = raw;
      hasAny = true;
    } else {
      selections[cat.id] = null; // default resolved later for required categories
    }
  }
  for (const field of manifest.textFields) {
    const v = params.get(field.id);
    if (v != null) {
      text[field.id] = v;
      hasAny = true;
    }
  }
  return { selections, text, hasAny };
}
