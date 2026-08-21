import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import SearchBar from './SearchBar.jsx';
import Pagination from './Pagination.jsx';
import SearchableSelect from './SearchableSelect.jsx';

const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 per page' },
  { value: '100', label: '100 per page' },
  { value: '1000', label: '1000 per page' },
  { value: '10000', label: '10000 per page' },
];

// Shared by the "Posts" (origin: manual) and "AI Posts" (origin: rss) admin
// pages — identical search/tag/date filtering, pagination, bulk-select, and
// edit/delete, differing only in which origin they list and a couple of
// optional UI bits.
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
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

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

  const tagOptions = useMemo(
    () => [{ value: '', label: 'All tags' }, ...allTags.map((tag) => ({ value: tag, label: tag }))],
    [allTags]
  );

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

  function handlePageSizeChange(value) {
    setPageSize(Number(value));
    setPage(1);
  }

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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      window.alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected post${ids.length === 1 ? '' : 's'}? This can't be undone.`)) return;

    setBulkDeleting(true);
    try {
      const res = await authFetch('/api/delete-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      const deleted = new Set(ids);
      setPosts((prev) => prev.filter((p) => !deleted.has(p.id)));
      setSelectedIds(new Set());
    } catch (err) {
      window.alert(`Failed to delete selected posts: ${err.message}`);
    } finally {
      setBulkDeleting(false);
    }
  }

  if (error) return <p className="status-message error">Failed to load posts: {error}</p>;
  if (!posts) return <p className="status-message">Loading…</p>;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageIds = pageItems.map((p) => p.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>{title}</h1>
        <SearchBar value={search} onChange={handleSearchChange} placeholder={searchPlaceholder} />
        {newPostLink && <Link to={newPostLink} className="button-link">+ New Post</Link>}
      </div>

      <div className="admin-filter-row">
        <SearchableSelect options={tagOptions} value={tagFilter} onChange={handleTagChange} placeholder="All tags" ariaLabel="Filter by tag" />
        <input type="date" value={fromDate} onChange={(e) => handleFromChange(e.target.value)} aria-label="Posted from" />
        <input type="date" value={toDate} onChange={(e) => handleToChange(e.target.value)} aria-label="Posted to" />
        <SearchableSelect
          options={PAGE_SIZE_OPTIONS}
          value={String(pageSize)}
          onChange={handlePageSizeChange}
          placeholder="Per page"
          ariaLabel="Posts per page"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <>
          <div className="admin-bulk-bar">
            <label className="admin-select-all">
              <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} />
              Select all on this page
            </label>
            {selectedIds.size > 0 && (
              <button className="button-danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
              </button>
            )}
          </div>

          <div className="admin-list">
            {pageItems.map((post) => (
              <div key={post.id} className="admin-list-row">
                <input
                  type="checkbox"
                  className="admin-list-checkbox"
                  checked={selectedIds.has(post.id)}
                  onChange={() => toggleSelectOne(post.id)}
                  aria-label={`Select "${post.title}"`}
                />
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
