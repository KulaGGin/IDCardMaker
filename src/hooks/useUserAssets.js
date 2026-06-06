import { useCallback, useEffect, useRef, useState } from 'react';
import { loadRecords, saveRecords, clearRecords } from '../utils/packStore.js';
import { parseUserPack, optionFromRecord } from '../utils/userPack.js';

// Owns user-uploaded options: rehydrates from IndexedDB on mount, accepts new
// .zip packs, and persists them. userOptions is { categoryId: [option] }.
export function useUserAssets() {
  const [userOptions, setUserOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState(null);
  const optionsRef = useRef({}); // mirror of userOptions for reads inside addPack
  const urlsRef = useRef([]); // object URLs to revoke on clear

  const addRecords = useCallback((records) => {
    setUserOptions((prev) => {
      const next = { ...prev };
      for (const rec of records) {
        const opt = optionFromRecord(rec);
        urlsRef.current.push(opt.src, opt.thumb);
        next[rec.categoryId] = [...(next[rec.categoryId] || []), opt];
      }
      optionsRef.current = next;
      return next;
    });
  }, []);

  // Rehydrate persisted packs once on mount.
  useEffect(() => {
    let alive = true;
    loadRecords()
      .then((recs) => {
        if (alive && recs.length) addRecords(recs);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [addRecords]);

  const addPack = useCallback(
    async (file, manifest) => {
      const knownCategoryIds = manifest.categories.map((c) => c.id);
      const existingIdsByCat = {};
      for (const c of manifest.categories) {
        existingIdsByCat[c.id] = new Set(c.options.map((o) => o.id));
      }
      for (const [cat, opts] of Object.entries(optionsRef.current)) {
        existingIdsByCat[cat] = existingIdsByCat[cat] || new Set();
        for (const o of opts) existingIdsByCat[cat].add(o.id);
      }
      const { records, warnings } = await parseUserPack(file, knownCategoryIds, existingIdsByCat);
      if (records.length) {
        try {
          await saveRecords(records);
        } catch (e) {
          warnings.push(`Couldn't save for next time: ${e.message}`);
        }
        addRecords(records);
      }
      const result = { added: records.length, categories: new Set(records.map((r) => r.categoryId)).size, warnings };
      setLastResult(result);
      return result;
    },
    [addRecords]
  );

  const clear = useCallback(async () => {
    try {
      await clearRecords();
    } catch {
      /* ignore */
    }
    for (const u of urlsRef.current) URL.revokeObjectURL(u);
    urlsRef.current = [];
    optionsRef.current = {};
    setUserOptions({});
    setLastResult(null);
  }, []);

  return { userOptions, loading, addPack, clear, lastResult };
}
