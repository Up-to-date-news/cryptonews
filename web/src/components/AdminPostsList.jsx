import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import SearchBar from './SearchBar.jsx';
import Pagination from './Pagination.jsx';
import TagFilterSelect from './TagFilterSelect.jsx';

const PAGE_SIZE = 20;

// Shared by the "Posts" (origin: manual) and "AI Posts" (origin: rss) admin
// pages — identical search/tag/date filtering, pagination, and edit/delete,
// differing only in which origin they list and a couple of optional UI bits.
export default function AdminPostsList({
  title,
  filterOrigin,
  newPostLink,
  showContentBadge = false,
  searchPlaceholder = 'Search posts…',
  emptyMessage = 'No posts match.',
}) {
  const { authFetch } = useAdminAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  function loadPosts() {
    fetch('/data/index.json')
      .then((r) => r.json())
      .then((data) => setPosts(data.filter((a) => filterOrigin(a.origin)).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))))
      .catch((err) => setError(err.message));
  }

  useEffect(loadPosts, []);

  const allTags = useMemo(() => {
    if (!posts) return [];
    const tags = new Set(posts.flatMap((p) => p.tags ?? []));
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    return posts.filter((post) => {
      if (q && !post.title.toLowerCase().includes(q)) return false;
      if (tagFilter && !post.tags?.includes(tagFilter)) return false;
      const pubDate = post.pubDate ? new Date(post.pubDate) : null;
      if (from && (!pubDate || pubDate < from)) return false;
      if (to && (!pubDate || pubDate > to)) return false;
      return true;
    });
  }, [posts, search, tagFilter, fromDate, toDate]);

  function resetToFirstPage(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  const handleSearchChange = resetToFirstPage(setSearch);
  const handleTagChange = resetToFirstPage(setTagFilter);
  const handleFromChange = resetToFirstPage(setFromDate);
  const handleToChange = resetToFirstPage(setToDate);

  async function handleDelete(id, postTitle) {
    if (!window.confirm(`Delete "${postTitle}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await authFetch('/api/delete-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      window.alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <p className="status-message error">Failed to load posts: {error}</p>;
  if (!posts) return <p className="status-message">Loading…</p>;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{title}</h1>
        {newPostLink && <Link to={newPostLink} className="button-link">+ New Post</Link>}
      </div>

      <div className="admin-filter-row">
        <SearchBar value={search} onChange={handleSearchChange} placeholder={searchPlaceholder} />
        <TagFilterSelect tags={allTags} value={tagFilter} onChange={handleTagChange} />
        <input type="date" value={fromDate} onChange={(e) => handleFromChange(e.target.value)} aria-label="Posted from" />
        <input type="date" value={toDate} onChange={(e) => handleToChange(e.target.value)} aria-label="Posted to" />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <>
          <div className="admin-list">
            {pageItems.map((post) => (
              <div key={post.id} className="admin-list-row">
                <div className="admin-list-main">
                  <span className="admin-list-title">{post.title}</span>
                  <div className="tag-list">
                    {showContentBadge && (
                      <span className={post.hasContent ? 'content-status-badge has-content' : 'content-status-badge needs-content'}>
                        {post.hasContent ? 'Has content' : 'Needs content'}
                      </span>
                    )}
                    {post.tags?.map((tag) => (
                      <span key={tag} className="tag-pill-sm">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="admin-list-actions">
                  <Link to={`/admin/posts/${post.id}/edit`} className="button-secondary">Edit</Link>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={deletingId === post.id}
                    className="button-danger"
                  >
                    {deletingId === post.id ? 'Deleting…' : 'Delete'}
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
