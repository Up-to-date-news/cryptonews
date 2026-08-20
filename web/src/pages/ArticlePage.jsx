import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useArticles } from '../data/useArticles.js';
import { ChevronRightIcon } from '../components/icons.jsx';

function dayKeyFromPubDate(pubDate) {
  return new Date(pubDate).toISOString().slice(0, 10);
}

async function resolvePubDate(id) {
  const res = await fetch('/data/index.json');
  if (!res.ok) throw new Error(`Failed to load index.json: ${res.status}`);
  const index = await res.json();
  const entry = index.find((item) => item.id === id);
  if (!entry) throw new Error('Article not found in index.');
  return entry.pubDate;
}

export default function ArticlePage() {
  const { id } = useParams();
  const location = useLocation();
  const { articles } = useArticles();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const pubDate = location.state?.pubDate ?? (await resolvePubDate(id));
      const day = dayKeyFromPubDate(pubDate);
      const res = await fetch(`/data/articles/${day}.json`);
      if (!res.ok) throw new Error(`Failed to load ${day}.json: ${res.status}`);
      const dayArticles = await res.json();
      const found = dayArticles.find((item) => item.id === id);
      if (!found) throw new Error('Article not found.');
      return found;
    }

    load()
      .then((found) => {
        if (!cancelled) setArticle(found);
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
  }, [id, location.state]);

  if (loading) return <p className="status-message">Loading…</p>;
  if (error) return <p className="status-message error">{error}</p>;

  const currentIndex = articles.findIndex((a) => a.id === id);
  const nextArticle = currentIndex >= 0 && currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  return (
    <article className="article-page">
      <Link to="/" className="back-link">← Back</Link>
      {article.imagePath && (
        <img src={`/${article.imagePath}`} alt="" className="article-detail-image" />
      )}
      <h1>{article.title}</h1>
      {article.tags?.length > 0 && (
        <div className="tag-list">
          {article.tags.map((tag) => (
            <span key={tag} className="tag-pill">{tag}</span>
          ))}
        </div>
      )}
      <p className="article-content">{article.content ?? 'Content unavailable for this article.'}</p>
      <p className="article-pubdate">
        Published {article.pubDate ? new Date(article.pubDate).toLocaleString() : 'date unknown'}
      </p>

      {nextArticle && (
        <Link to={`/article/${nextArticle.id}`} state={{ pubDate: nextArticle.pubDate }} className="sticky-next-button">
          Next Post <ChevronRightIcon size={16} />
        </Link>
      )}
    </article>
  );
}
