import { Link } from 'react-router-dom';

function timeAgo(pubDate) {
  if (!pubDate) return '';
  const diffMs = Date.now() - new Date(pubDate).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ArticleCard({ article }) {
  return (
    <Link
      to={`/article/${article.slug}`}
      state={{ pubDate: article.pubDate }}
      className="article-card"
    >
      <h3 className="article-card-title">{article.title}</h3>
      <div className="article-card-meta">
        {article.tags?.length > 0 && (
          <span className="article-card-tags">
            {article.tags.map((tag) => (
              <span key={tag} className="tag-pill-sm">{tag}</span>
            ))}
          </span>
        )}
        <span className="article-card-time">{timeAgo(article.pubDate)}</span>
      </div>
    </Link>
  );
}
