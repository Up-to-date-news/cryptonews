import { useEffect, useState } from 'react';

export function useNeedsContent() {
  const [articles, setArticles] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/index.json')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const needsContent = data
          .filter((a) => a.hasContent === false)
          .sort((a, b) => new Date(b.pubDate ?? 0) - new Date(a.pubDate ?? 0));
        setArticles(needsContent);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { articles, count: articles?.length ?? 0, loading: articles === null && !error, error };
}
