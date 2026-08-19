import { useSearchParams } from 'react-router-dom';
import { useArticles } from '../data/useArticles.js';
import ArticleList from '../components/ArticleList.jsx';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 20;

export default function ListPage() {
  const { articles, loading, error } = useArticles();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  if (loading) return <p className="status-message">Loading…</p>;
  if (error) return <p className="status-message error">Failed to load articles: {error}</p>;

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = articles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goToPage(nextPage) {
    setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) });
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="list-page">
      <h1>Latest</h1>
      <ArticleList articles={pageItems} />
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={goToPage} />
    </div>
  );
}
