import { useEffect, useState } from 'react';
import { MANIFEST_URL } from '../utils/constants.js';

export function useManifest() {
  const [state, setState] = useState({ manifest: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    fetch(MANIFEST_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((manifest) => alive && setState({ manifest, loading: false, error: null }))
      .catch((error) => alive && setState({ manifest: null, loading: false, error }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
