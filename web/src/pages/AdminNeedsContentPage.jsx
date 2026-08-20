import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import { useNeedsContent } from '../data/useNeedsContent.js';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 20;

export default function AdminNeedsContentPage() {
  const { authFetch } = useAdminAuth();
  const { articles, error } = useNeedsContent();
  const [removedIds, setRemovedIds] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  if (error) return <p className="status-message error">Failed to load: {error}</p>;
  if (!articles) return <p className="status-message">Loading…</p>;

  const remaining = articles.filter((a) => !removedIds.has(a.id));
  const q = search.trim().toLowerCase();
  const filtered = q ? remaining.filter((a) => a.title.toLowerCase().includes(q)) : remaining;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await authFetch('/api/delete-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      setRemovedIds((prev) => new Set(prev).add(id));
    } catch (err) {
      window.alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Needs Content</h1>
        <span className="admin-form-label">{remaining.length} waiting</span>
      </div>
      <p className="needs-content-intro">
        These articles were fetched from RSS but didn't get AI-generated content
        (usually because the daily AI quota ran out). Edit each one to add content
        manually — once saved, it drops off this list.
      </p>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search…" />

      {filtered.length === 0 ? (
        <p className="empty-state">{remaining.length === 0 ? 'Nothing needs content right now.' : 'No matches.'}</p>
      ) : (
        <>
          <div className="admin-list">
            {pageItems.map((article) => (
              <div key={article.id} className="admin-list-row">
                <div className="admin-list-main">
                  <span className="admin-list-title">{article.title}</span>
                  <div className="tag-list">
                    <span className="tag-pill-sm">{article.source}</span>
                    <span className="tag-pill-sm">{new Date(article.pubDate).toLocaleString()}</span>
                  </div>
                </div>
                <div className="admin-list-actions">
                  <Link to={`/admin/posts/${article.id}/edit`} className="button-secondary">Add content</Link>
                  <button
                    onClick={() => handleDelete(article.id, article.title)}
                    disabled={deletingId === article.id}
                    className="button-danger"
                  >
                    {deletingId === article.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
