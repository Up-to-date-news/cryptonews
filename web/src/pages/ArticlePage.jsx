import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRightIcon } from '../components/icons.jsx';
import { usePageMeta, SITE_NAME, SITE_URL } from '../hooks/usePageMeta.js';

function dayKeyFromPubDate(pubDate) {
  return new Date(pubDate).toISOString().slice(0, 10);
}

async function resolvePubDate(slug) {
  const res = await fetch('/data/index.json');
  if (!res.ok) throw new Error(`Failed to load index.json: ${res.status}`);
  const index = await res.json();
  const entry = index.find((item) => item.slug === slug);
  if (!entry) throw new Error('Article not found in index.');
  return entry.pubDate;
}

export default function ArticlePage() {
  const { slug } = useParams();
  const location = useLocation();
  const [article, setArticle] = useState(null);
  // Same day's articles, sorted newest-first — enough to compute "next
  // article" without ever fetching the full (and ever-growing) index.json,
  // which used to be pulled in just for this one lookup.
  const [siblingArticles, setSiblingArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const pubDate = location.state?.pubDate ?? (await resolvePubDate(slug));
      const day = dayKeyFromPubDate(pubDate);
      const res = await fetch(`/data/articles/${day}.json`);
      if (!res.ok) throw new Error(`Failed to load ${day}.json: ${res.status}`);
      const dayArticles = await res.json();
      const found = dayArticles.find((item) => item.slug === slug);
      if (!found) throw new Error('Article not found.');
      const sorted = [...dayArticles].sort((a, b) => new Date(b.pubDate ?? 0) - new Date(a.pubDate ?? 0));
      return { found, sorted };
    }

    load()
      .then(({ found, sorted }) => {
        if (!cancelled) {
          setArticle(found);
          setSiblingArticles(sorted);
        }
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
  }, [slug, location.state]);

  const description = article?.content
    ? article.content.slice(0, 160)
    : article?.summary ?? undefined;

  usePageMeta({
    title: article?.title,
    description,
    path: `/article/${slug}`,
    image: article?.imagePath ? `${SITE_URL}/${article.imagePath}` : undefined,
    type: 'article',
    jsonLd: article
      ? {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: article.title,
          description,
          image: article.imagePath ? [`${SITE_URL}/${article.imagePath}`] : undefined,
          datePublished: article.pubDate,
          dateModified: article.pubDate,
          mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/article/${slug}` },
          author: { '@type': 'Organization', name: SITE_NAME },
          publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/favicon.png` },
          },
        }
      : null,
  });

  if (loading) return <p className="status-message">Loading…</p>;
  if (error) return <p className="status-message error">{error}</p>;

  const currentIndex = siblingArticles.findIndex((a) => a.slug === slug);
  const nextArticle = currentIndex >= 0 && currentIndex < siblingArticles.length - 1 ? siblingArticles[currentIndex + 1] : null;

  return (
    <article className="article-page">
      <Link to="/" className="back-link">← Back</Link>
      {article.imagePath && (
        <img src={`/${article.imagePath}`} alt="" className="article-detail-image" fetchpriority="high" decoding="async" />
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
        <Link to={`/article/${nextArticle.slug}`} state={{ pubDate: nextArticle.pubDate }} className="sticky-next-button">
          Next Post <ChevronRightIcon size={16} />
        </Link>
      )}
    </article>
  );
}
