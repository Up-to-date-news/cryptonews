import { useEffect, useState } from 'react';

export function useArticles() {
  const [articles, setArticles] = useState([]);
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
        if (cancelled) return;
        const sorted = [...data].sort((a, b) => new Date(b.pubDate ?? 0) - new Date(a.pubDate ?? 0));
        setArticles(sorted);
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

  return { articles, loading, error };
}
