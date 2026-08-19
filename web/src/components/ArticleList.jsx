import ArticleCard from './ArticleCard.jsx';

export default function ArticleList({ articles }) {
  if (articles.length === 0) {
    return <p className="empty-state">No articles yet.</p>;
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
