import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import { getEventStatus } from '../data/eventStatus.js';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 20;

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
}

export default function AdminEventsListPage() {
  const { authFetch } = useAdminAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pricingFilter, setPricingFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  function loadEvents() {
    fetch('/data/events/index.json')
      .then((r) => r.json())
      .then((data) => setEvents([...data].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))))
      .catch((err) => setError(err.message));
  }

  useEffect(loadEvents, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    return events.filter((event) => {
      if (q && !event.title.toLowerCase().includes(q)) return false;
      if (statusFilter && getEventStatus(event) !== statusFilter) return false;
      if (pricingFilter && (event.pricing ?? 'free') !== pricingFilter) return false;
      if (formatFilter && (event.mode ?? 'offline') !== formatFilter) return false;
      const createdAt = event.fetchedAt ? new Date(event.fetchedAt) : null;
      if (from && (!createdAt || createdAt < from)) return false;
      if (to && (!createdAt || createdAt > to)) return false;
      return true;
    });
  }, [events, search, statusFilter, pricingFilter, formatFilter, fromDate, toDate]);

  function resetToFirstPage(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Events</h1>
        <Link to="/admin/events/new" className="button-link">+ New Event</Link>
      </div>

      <div className="admin-filter-row">
        <SearchBar value={search} onChange={resetToFirstPage(setSearch)} placeholder="Search events…" />
        <select value={statusFilter} onChange={(e) => resetToFirstPage(setStatusFilter)(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="ended">Ended</option>
        </select>
        <select value={pricingFilter} onChange={(e) => resetToFirstPage(setPricingFilter)(e.target.value)} aria-label="Filter by pricing">
          <option value="">Free or paid</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
          <option value="both">Both</option>
        </select>
        <select value={formatFilter} onChange={(e) => resetToFirstPage(setFormatFilter)(e.target.value)} aria-label="Filter by format">
          <option value="">Online or offline</option>
          <option value="offline">Offline</option>
          <option value="online">Online</option>
          <option value="hybrid">Both</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => resetToFirstPage(setFromDate)(e.target.value)}
          aria-label="Created from"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => resetToFirstPage(setToDate)(e.target.value)}
          aria-label="Created to"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No events match.</p>
      ) : (
        <>
          <div className="admin-list">
            {pageItems.map((event) => (
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
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
