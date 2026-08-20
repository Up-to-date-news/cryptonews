import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../admin/useAdminAuth.js';

export default function AdminTagsPage() {
  const { authFetch } = useAdminAuth();
  const [registeredTags, setRegisteredTags] = useState(null);
  const [usageCounts, setUsageCounts] = useState(new Map());
  const [error, setError] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | error | success

  function load() {
    Promise.all([
      fetch('/data/tags.json').then((r) => r.json()).catch(() => []),
      fetch('/data/index.json').then((r) => r.json()).catch(() => []),
    ])
      .then(([tags, index]) => {
        const counts = new Map();
        for (const item of index) {
          for (const tag of item.tags ?? []) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
          }
        }
        setUsageCounts(counts);
        setRegisteredTags(tags);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  // Merge registered tags with tags picked up from actual posts, deduped —
  // a tag added here with zero usage still needs to show up, and a tag
  // used on a post without ever being explicitly "added" shouldn't be lost.
  const allTags = useMemo(() => {
    if (!registeredTags) return [];
    const merged = new Set([...registeredTags, ...usageCounts.keys()]);
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [registeredTags, usageCounts]);

  async function handleAddTag(e) {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (!trimmed) return;

    if (allTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setStatus('error');
      return;
    }

    setStatus('submitting');
    try {
      const res = await authFetch('/api/add-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      setStatus('success');
      setNewTag('');
      load();
    } catch {
      setStatus('error');
    }
  }

  if (error) return <p className="status-message error">Failed to load tags: {error}</p>;
  if (!registeredTags) return <p className="status-message">Loading…</p>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Tags</h1>
        <span className="admin-form-label">{allTags.length} total</span>
      </div>

      <form onSubmit={handleAddTag} className="inline-form">
        <input
          type="text"
          value={newTag}
          onChange={(e) => {
            setNewTag(e.target.value);
            setStatus('idle');
          }}
          placeholder="Add a new tag…"
        />
        <button type="submit" disabled={status === 'submitting'}>Add tag</button>
      </form>
      {status === 'error' && <p className="admin-status error">That tag already exists, or something went wrong.</p>}
      {status === 'success' && <p className="admin-status success">Tag added.</p>}

      <div className="tag-list">
        {allTags.length === 0 && <p className="empty-state">No tags yet — add one above.</p>}
        {allTags.map((tag) => (
          <span key={tag} className="tag-pill">
            {tag} <span className="tag-pill-count">{usageCounts.get(tag) ?? 0}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
