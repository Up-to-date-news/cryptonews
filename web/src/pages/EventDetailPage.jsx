import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Date TBA';
  const opts = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' };
  const start = new Date(startDate).toLocaleString(undefined, opts);
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleString(undefined, opts);
  return `${start} – ${end}`;
}

export default function EventDetailPage() {
  const { id } = useParams();
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
        const found = data.find((e) => e.id === id);
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
  }, [id]);

  if (loading) return <p className="status-message">Loading…</p>;
  if (error) return <p className="status-message error">{error}</p>;

  return (
    <article className="event-detail-page">
      <Link to="/events" className="back-link">← Back to events</Link>

      {event.imagePath && (
        <img src={`/${event.imagePath}`} alt={event.title} className="event-detail-image" />
      )}

      <h1>{event.title}</h1>

      <div className="tag-list">
        <span className="tag-pill-sm">{formatModeLabel(event.mode)}</span>
        <span className="tag-pill-sm">{formatPricingLabel(event.pricing)}</span>
      </div>

      <p className="event-detail-meta">{formatDateRange(event.startDate, event.endDate)}</p>
      {event.location && <p className="event-detail-meta">{event.location}</p>}

      {event.description && <p className="article-content">{event.description}</p>}

      {event.link && (
        <a href={event.link} target="_blank" rel="noopener noreferrer" className="read-full-link">
          Event link →
        </a>
      )}
    </article>
  );
}
