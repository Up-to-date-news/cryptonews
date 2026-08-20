import { useEffect, useMemo, useState } from 'react';

function dayKey(pubDate) {
  return pubDate ? new Date(pubDate).toISOString().slice(0, 10) : null;
}

export default function AdminDashboardPage() {
  const [index, setIndex] = useState(null);
  const [feedCount, setFeedCount] = useState(null);
  const [eventCount, setEventCount] = useState(null);
  const [error, setError] = useState(null);

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

    return {
      totalFeeds: feedCount,
      totalRss: rssItems.length,
      todayCount: rssPerDay.get(today) ?? 0,
      avgPerDay: avgPerDay.toFixed(1),
      totalManual: manualItems.length,
    };
  }, [index, feedCount]);

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
    </div>
  );
}
