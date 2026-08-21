import { Link } from 'react-router-dom';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';

// Shown in the event's own timezone (not the viewer's) — what matters for
// "should I attend" is the venue-local date/time, e.g. a Dubai event reads
// the same "Sep 9" for a visitor in Tokyo as it does for one in Dubai.
function formatDateRange(startDate, endDate, timezone) {
  if (!startDate) return 'Date TBA';
  const opts = { month: 'short', day: 'numeric', year: 'numeric', timeZone: timezone || 'UTC' };
  const start = new Date(startDate).toLocaleDateString(undefined, opts);
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString(undefined, opts);
  return start === end ? start : `${start} – ${end}`;
}

export default function EventCard({ event }) {
  return (
    <Link to={`/event/${event.slug}`} className="event-card">
      {event.imagePath && (
        <img src={`/${event.imagePath}`} alt="" className="event-card-thumb" loading="lazy" decoding="async" width="72" height="72" />
      )}
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        <div className="event-card-meta">
          <span>
            {event.location && <span className="event-card-location">{event.location}</span>}
            <span className="tag-pill-sm">{formatModeLabel(event.mode)}</span>
            <span className="tag-pill-sm">{formatPricingLabel(event.pricing)}</span>
          </span>
          <span className="event-card-date">{formatDateRange(event.startDate, event.endDate, event.timezone)}</span>
        </div>
      </div>
    </Link>
  );
}
