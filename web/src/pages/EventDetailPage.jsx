import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';
import { useEvents } from '../data/useEvents.js';
import { ChevronRightIcon } from '../components/icons.jsx';
import { usePageMeta, SITE_NAME, SITE_URL } from '../hooks/usePageMeta.js';

const ATTENDANCE_MODE = {
  online: 'https://schema.org/OnlineEventAttendanceMode',
  offline: 'https://schema.org/OfflineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
};

// Shown in the event's own timezone (not the viewer's) with its
// abbreviation, e.g. "Sep 9, 2026, 10:00 AM GST" — everyone sees the
// venue-local time the organizer actually advertised.
function formatDateRange(startDate, endDate, timezone) {
  if (!startDate) return 'Date TBA';
  const opts = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || 'UTC',
    timeZoneName: 'short',
  };
  const start = new Date(startDate).toLocaleString(undefined, opts);
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleString(undefined, opts);
  return `${start} – ${end}`;
}

export default function EventDetailPage() {
  const { slug } = useParams();
  const { events } = useEvents();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/events/index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load events: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const found = data.find((e) => e.slug === slug);
        if (!found) throw new Error('Event not found.');
        setEvent(found);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageMeta({
    title: event?.title,
    description: event?.description?.slice(0, 160),
    path: `/event/${slug}`,
    image: event?.imagePath ? `${SITE_URL}/${event.imagePath}` : undefined,
    type: 'article',
    jsonLd: event
      ? {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate ?? undefined,
          eventAttendanceMode: ATTENDANCE_MODE[event.mode] ?? ATTENDANCE_MODE.offline,
          eventStatus: 'https://schema.org/EventScheduled',
          location: event.location
            ? { '@type': 'Place', name: event.location, address: event.location }
            : undefined,
          image: event.imagePath ? [`${SITE_URL}/${event.imagePath}`] : undefined,
          url: `${SITE_URL}/event/${slug}`,
          organizer: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        }
      : null,
  });

  if (loading) return <p className="status-message">Loading…</p>;
  if (error) return <p className="status-message error">{error}</p>;

  const currentIndex = events.findIndex((e) => e.slug === slug);
  const nextEvent = currentIndex >= 0 && currentIndex < events.length - 1 ? events[currentIndex + 1] : null;

  return (
    <article className="event-detail-page">
      <Link to="/events" className="back-link">← Back to events</Link>

      {event.imagePath && (
        <img src={`/${event.imagePath}`} alt={event.title} className="event-detail-image" fetchpriority="high" decoding="async" />
      )}

      <h1>{event.title}</h1>

      <div className="tag-list">
        <span className="tag-pill-sm">{formatModeLabel(event.mode)}</span>
        <span className="tag-pill-sm">{formatPricingLabel(event.pricing)}</span>
      </div>

      <p className="event-detail-meta">{formatDateRange(event.startDate, event.endDate, event.timezone)}</p>
      {event.location && <p className="event-detail-meta">{event.location}</p>}

      {event.description && <p className="article-content">{event.description}</p>}

      {event.link && (
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="read-full-link">
          Event link →
        </a>
      )}

      {nextEvent && (
        <Link to={`/event/${nextEvent.slug}`} className="sticky-next-button">
          Next Event <ChevronRightIcon size={16} />
        </Link>
      )}
    </article>
  );
}
