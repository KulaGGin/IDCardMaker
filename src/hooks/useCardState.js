import { useCallback, useEffect, useMemo, useState } from 'react';
import { encodeStateToParams, parseParamsToState } from '../utils/urlState.js';

function defaultSelections(manifest) {
  const sel = {};
  for (const cat of manifest.categories) {
    if (cat.select === 'multi') sel[cat.id] = [];
    else if (cat.fixed || cat.required) sel[cat.id] = cat.options[0]?.id ?? null;
    else sel[cat.id] = null;
  }
  return sel;
}

function defaultText(manifest) {
  const t = {};
  for (const f of manifest.textFields) t[f.id] = '';
  return t;
}

function initialState(manifest) {
  const baseSel = defaultSelections(manifest);
  const baseText = defaultText(manifest);
  const parsed = parseParamsToState(manifest);
  if (!parsed.hasAny) return { selections: baseSel, text: baseText };

  const selections = { ...baseSel };
  for (const cat of manifest.categories) {
    if (cat.select === 'multi') selections[cat.id] = parsed.selections[cat.id];
    else if (cat.fixed) selections[cat.id] = baseSel[cat.id];
    else if (parsed.selections[cat.id]) selections[cat.id] = parsed.selections[cat.id];
    // else keep base default (required) or null (optional)
  }
  return { selections, text: { ...baseText, ...parsed.text } };
}

export function useCardState(manifest) {
  const init = useMemo(() => initialState(manifest), [manifest]);
  const [selections, setSelections] = useState(init.selections);
  const [text, setTextState] = useState(init.text);

  const setSingle = useCallback((catId, optId) => {
    setSelections((s) => ({ ...s, [catId]: optId }));
  }, []);

  const clearSingle = useCallback((catId) => {
    setSelections((s) => ({ ...s, [catId]: null }));
  }, []);

  const toggleMulti = useCallback((catId, optId) => {
    setSelections((s) => {
      const cur = s[catId] ?? [];
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
      return { ...s, [catId]: next };
    });
  }, []);

  const setText = useCallback((fieldId, value) => {
    setTextState((t) => ({ ...t, [fieldId]: value }));
  }, []);

  const reset = useCallback(() => {
    setSelections(defaultSelections(manifest));
    setTextState(defaultText(manifest));
  }, [manifest]);

  const randomize = useCallback(() => {
    const sel = {};
    for (const cat of manifest.categories) {
      const opts = cat.options;
      if (cat.select === 'multi') {
        sel[cat.id] = opts.filter(() => Math.random() < 0.5).map((o) => o.id);
      } else if (cat.fixed) {
        sel[cat.id] = opts[0]?.id ?? null;
      } else if (!cat.required && Math.random() < 0.2) {
        sel[cat.id] = null;
      } else {
        sel[cat.id] = opts.length ? opts[Math.floor(Math.random() * opts.length)].id : null;
      }
    }
    setSelections(sel);
  }, [manifest]);

  // Mirror state into the URL (debounced) so the card is always shareable.
  useEffect(() => {
    const handle = setTimeout(() => {
      const qs = encodeStateToParams(manifest, selections, text).toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    }, 250);
    return () => clearTimeout(handle);
  }, [manifest, selections, text]);

  return { selections, text, setSingle, clearSingle, toggleMulti, setText, reset, randomize };
}
