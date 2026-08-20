import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
}

export default function AdminEventsListPage() {
  const { authFetch } = useAdminAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function loadEvents() {
    fetch('/data/events/index.json')
      .then((r) => r.json())
      .then((data) => setEvents([...data].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))))
      .catch((err) => setError(err.message));
  }

  useEffect(loadEvents, []);

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await authFetch('/api/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      window.alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <p className="status-message error">Failed to load events: {error}</p>;
  if (!events) return <p className="status-message">Loading…</p>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Events</h1>
        <Link to="/admin/events/new" className="button-link">+ New Event</Link>
      </div>

      {events.length === 0 ? (
        <p className="empty-state">No events yet.</p>
      ) : (
        <div className="admin-list">
          {events.map((event) => (
            <div key={event.id} className="admin-list-row">
              <div className="admin-list-main">
                <span className="admin-list-title">{event.title}</span>
                <div className="tag-list">
                  <span className="tag-pill-sm">{formatDate(event.startDate)}</span>
                  {event.location && <span className="tag-pill-sm">{event.location}</span>}
                  <span className="tag-pill-sm">{formatModeLabel(event.mode)}</span>
                  <span className="tag-pill-sm">{formatPricingLabel(event.pricing)}</span>
                </div>
              </div>
              <div className="admin-list-actions">
                <Link to={`/admin/events/${event.id}/edit`} className="button-secondary">Edit</Link>
                <button
                  onClick={() => handleDelete(event.id, event.title)}
                  disabled={deletingId === event.id}
                  className="button-danger"
                >
                  {deletingId === event.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
