import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';

export default function AdminPostsListPage() {
  const { authFetch } = useAdminAuth();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function loadPosts() {
    fetch('/data/index.json')
      .then((r) => r.json())
      .then((data) => setPosts(data.filter((a) => a.origin === 'manual').sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))))
      .catch((err) => setError(err.message));
  }

  useEffect(loadPosts, []);

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
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      window.alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <p className="status-message error">Failed to load posts: {error}</p>;
  if (!posts) return <p className="status-message">Loading…</p>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Posts</h1>
        <Link to="/admin/posts/new" className="button-link">+ New Post</Link>
      </div>

      {posts.length === 0 ? (
        <p className="empty-state">No manual posts yet.</p>
      ) : (
        <div className="admin-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-list-row">
              <div className="admin-list-main">
                <span className="admin-list-title">{post.title}</span>
                {post.tags?.length > 0 && (
                  <div className="tag-list">
                    {post.tags.map((tag) => (
                      <span key={tag} className="tag-pill-sm">{tag}</span>
                    ))}
                  </div>
                )}
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
      )}
    </div>
  );
}
