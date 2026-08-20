import { Link } from 'react-router-dom';
import { formatModeLabel, formatPricingLabel } from '../data/eventFormat.js';

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Date TBA';
  const start = new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return start === end ? start : `${start} – ${end}`;
}

export default function EventCard({ event }) {
  return (
    <Link to={`/event/${event.id}`} className="event-card">
      {event.imagePath && (
        <img src={`/${event.imagePath}`} alt="" className="event-card-thumb" />
      )}
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        <div className="event-card-meta">
          <span>
            {event.location && <span className="event-card-location">{event.location}</span>}
            <span className="tag-pill-sm">{formatModeLabel(event.mode)}</span>
            <span className="tag-pill-sm">{formatPricingLabel(event.pricing)}</span>
          </span>
          <span className="event-card-date">{formatDateRange(event.startDate, event.endDate)}</span>
        </div>
      </div>
    </Link>
  );
}
