import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../data/useEvents.js';
import { getEventStatus } from '../data/eventStatus.js';
import EventCard from '../components/EventCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchBar from '../components/SearchBar.jsx';

const PAGE_SIZE = 20;
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'ended', label: 'Ended' },
];

export default function EventsPage() {
  const { events, loading, error } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const tab = searchParams.get('tab') ?? 'all';

  const filtered = useMemo(() => {
    const byTab = tab === 'all' ? events : events.filter((event) => getEventStatus(event) === tab);
    const q = search.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((event) => event.title.toLowerCase().includes(q) || event.location?.toLowerCase().includes(q));
  }, [events, tab, search]);

  if (loading) return <p className="status-message">Loading…</p>;
  if (error) return <p className="status-message error">Failed to load events: {error}</p>;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function goToPage(nextPage) {
    const params = { ...(tab !== 'all' && { tab }) };
    if (nextPage !== 1) params.page = String(nextPage);
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  }

  function selectTab(nextTab) {
    setSearchParams(nextTab === 'all' ? {} : { tab: nextTab });
  }

  function handleSearchChange(value) {
    setSearch(value);
    goToPage(1);
  }

  return (
    <div className="events-page">
      <h1>Events</h1>

      <SearchBar value={search} onChange={handleSearchChange} placeholder="Search events…" />

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === tab ? 'tab active' : 'tab'}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No events here.</p>
      ) : (
        <>
          <div className="event-list">
            {pageItems.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}
    </div>
  );
}
