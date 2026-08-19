export function getEventStatus(event) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : start;

  // Ongoing = today's calendar date falls within the event's date range,
  // so a multi-day event (or one starting later today) shows as ongoing
  // for its whole span rather than flipping on exact start/end timestamps.
  if (start <= todayEnd && end >= todayStart) return 'ongoing';
  if (start > todayEnd) return 'upcoming';
  return 'ended';
}
