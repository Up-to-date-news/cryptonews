import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '../admin/useAdminAuth.js';

function dayKey(pubDate) {
  return pubDate ? new Date(pubDate).toISOString().slice(0, 10) : null;
}

export default function AdminDashboardPage() {
  const { authFetch } = useAdminAuth();
  const [index, setIndex] = useState(null);
  const [feedCount, setFeedCount] = useState(null);
  const [eventCount, setEventCount] = useState(null);
  const [error, setError] = useState(null);
  const [newTag, setNewTag] = useState('');
  const [tagStatus, setTagStatus] = useState('idle'); // idle | submitting | error | success

  useEffect(() => {
    Promise.all([
      fetch('/data/index.json').then((r) => r.json()),
      fetch('/data/feeds.json').then((r) => r.json()),
      fetch('/data/events/index.json').then((r) => r.json()),
    ])
      .then(([indexData, feedsData, eventsData]) => {
        setIndex(indexData);
        setFeedCount(feedsData.length);
        setEventCount(eventsData.length);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = useMemo(() => {
    if (!index) return null;

    const rssItems = index.filter((a) => a.origin !== 'manual');
    const manualItems = index.filter((a) => a.origin === 'manual');
    const today = new Date().toISOString().slice(0, 10);

    const rssPerDay = new Map();
    for (const item of rssItems) {
      const key = dayKey(item.pubDate);
      if (!key) continue;
      rssPerDay.set(key, (rssPerDay.get(key) ?? 0) + 1);
    }

    const distinctDays = rssPerDay.size || 1;
    const avgPerDay = rssItems.length / distinctDays;

    const tagCounts = new Map();
    for (const item of index) {
      for (const tag of item.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return {
      totalFeeds: feedCount,
      totalRss: rssItems.length,
      todayCount: rssPerDay.get(today) ?? 0,
      avgPerDay: avgPerDay.toFixed(1),
      totalManual: manualItems.length,
      tagCounts: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [index, feedCount]);

  async function handleAddTag(e) {
    e.preventDefault();
    if (!newTag.trim()) return;
    setTagStatus('submitting');
    try {
      const res = await authFetch('/api/add-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      setTagStatus('success');
      setNewTag('');
    } catch (err) {
      setTagStatus('error');
    }
  }

  if (error) return <p className="status-message error">Failed to load dashboard: {error}</p>;
  if (!stats) return <p className="status-message">Loading dashboard…</p>;

  return (
    <div className="admin-page">
      <h1>Dashboard</h1>

      <section>
        <h2 className="section-heading">RSS (auto-posted)</h2>
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-value">{stats.totalFeeds}</span>
            <span className="stat-label">RSS feed links</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{stats.todayCount}</span>
            <span className="stat-label">Published today</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{stats.avgPerDay}</span>
            <span className="stat-label">Avg per day</span>
          </div>
          <div className="stat-tile">
            <span className="stat-value">{stats.totalRss}</span>
            <span className="stat-label">Total articles</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Custom (manual posts)</h2>
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-value">{stats.totalManual}</span>
            <span className="stat-label">Manual posts</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Events</h2>
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-value">{eventCount}</span>
            <span className="stat-label">Total events</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Tags</h2>
        <form onSubmit={handleAddTag} className="inline-form">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a new tag…"
          />
          <button type="submit" disabled={tagStatus === 'submitting'}>Add tag</button>
        </form>
        {tagStatus === 'error' && <p className="admin-status error">Failed to add tag.</p>}
        {tagStatus === 'success' && <p className="admin-status success">Tag added.</p>}

        <div className="tag-list">
          {stats.tagCounts.length === 0 && <p className="empty-state">No tags yet.</p>}
          {stats.tagCounts.map(([tag, count]) => (
            <span key={tag} className="tag-pill">
              {tag} <span className="tag-pill-count">{count}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
