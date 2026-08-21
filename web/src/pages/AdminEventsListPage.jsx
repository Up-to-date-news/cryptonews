import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import { getEventStatus } from '../data/eventStatus.js';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';
import SearchBar from '../components/SearchBar.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchableSelect from '../components/SearchableSelect.jsx';

const PAGE_SIZE_OPTIONS = [
  { value: '20', label: '20 per page' },
  { value: '100', label: '100 per page' },
  { value: '1000', label: '1000 per page' },
  { value: '10000', label: '10000 per page' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'ended', label: 'Ended' },
];

const PRICING_OPTIONS = [
  { value: '', label: 'Free or paid' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'both', label: 'Both' },
];

const FORMAT_OPTIONS = [
  { value: '', label: 'Online or offline' },
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Both' },
];

function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';
}

export default function AdminEventsListPage() {
  const { authFetch } = useAdminAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pricingFilter, setPricingFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

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

  function handlePageSizeChange(value) {
    setPageSize(Number(value));
    setPage(1);
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
    if (!window.confirm(`Delete ${ids.length} selected event${ids.length === 1 ? '' : 's'}? This can't be undone.`)) return;

    setBulkDeleting(true);
    try {
      const res = await authFetch('/api/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);
      const deleted = new Set(ids);
      setEvents((prev) => prev.filter((e) => !deleted.has(e.id)));
      setSelectedIds(new Set());
    } catch (err) {
      window.alert(`Failed to delete selected events: ${err.message}`);
    } finally {
      setBulkDeleting(false);
    }
  }

  if (error) return <p className="status-message error">Failed to load events: {error}</p>;
  if (!events) return <p className="status-message">Loading…</p>;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pageIds = pageItems.map((e) => e.id);
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
        <h1>Events</h1>
        <SearchBar value={search} onChange={resetToFirstPage(setSearch)} placeholder="Search events…" />
        <Link to="/admin/events/new" className="button-link">+ New Event</Link>
      </div>

      <div className="admin-filter-row">
        <SearchableSelect options={STATUS_OPTIONS} value={statusFilter} onChange={resetToFirstPage(setStatusFilter)} placeholder="Any status" ariaLabel="Filter by status" />
        <SearchableSelect options={PRICING_OPTIONS} value={pricingFilter} onChange={resetToFirstPage(setPricingFilter)} placeholder="Free or paid" ariaLabel="Filter by pricing" />
        <SearchableSelect options={FORMAT_OPTIONS} value={formatFilter} onChange={resetToFirstPage(setFormatFilter)} placeholder="Online or offline" ariaLabel="Filter by format" />
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
        <SearchableSelect
          options={PAGE_SIZE_OPTIONS}
          value={String(pageSize)}
          onChange={handlePageSizeChange}
          placeholder="Per page"
          ariaLabel="Events per page"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No events match.</p>
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
            {pageItems.map((event) => (
              <div key={event.id} className="admin-list-row">
                <input
                  type="checkbox"
                  className="admin-list-checkbox"
                  checked={selectedIds.has(event.id)}
                  onChange={() => toggleSelectOne(event.id)}
                  aria-label={`Select "${event.title}"`}
                />
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
