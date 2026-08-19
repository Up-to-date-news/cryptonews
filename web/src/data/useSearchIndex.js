import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';

const FUSE_OPTIONS = {
  keys: ['title', 'tags', 'source'],
  threshold: 0.35,
};

export function useSearchIndex() {
  const [index, setIndex] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load index.json: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fuse = useMemo(() => new Fuse(index, FUSE_OPTIONS), [index]);

  function search(query) {
    if (!query.trim()) return index;
    return fuse.search(query).map((result) => result.item);
  }

  return { index, loading, error, search };
}
