// Offset (in minutes, UTC+x = positive) that `timeZone` has at `date`.
// Computed by re-reading `date`'s wall-clock fields as formatted in that
// zone, then comparing against the same instant read as UTC — no library
// needed, every evergreen browser and Node ship `Intl` with IANA data.
function getTimezoneOffsetMinutes(timeZone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const { type, value } of dtf.formatToParts(date)) {
    if (type !== 'literal') parts[type] = value;
  }
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  // Round to the whole minute: `asUTC` is built from second-precision
  // fields while `date.getTime()` carries milliseconds, so the raw
  // subtraction always drifts by date's leftover ms (offsets themselves
  // are never sub-minute).
  return Math.round((asUTC - date.getTime()) / 60000);
}

// "YYYY-MM-DDTHH:mm" wall-clock (as typed into a datetime-local input),
// interpreted as a moment in `timeZone`, converted to a UTC ISO string.
export function zonedTimeToUtcISOString(localDateTimeStr, timeZone) {
  if (!localDateTimeStr) return null;
  const naiveUtc = new Date(`${localDateTimeStr}:00Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, naiveUtc);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60000).toISOString();
}

// Reverse: a stored UTC ISO string, shown as "YYYY-MM-DDTHH:mm" wall-clock
// in `timeZone`, for populating a datetime-local input.
export function utcToZonedLocalValue(isoString, timeZone) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = {};
  for (const { type, value } of dtf.formatToParts(date)) {
    if (type !== 'literal') parts[type] = value;
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Formats a stored UTC ISO string in `timeZone` with the zone's own
// abbreviation (e.g. "Sep 9, 2026, 10:00 AM GST") — so every viewer sees
// the event's venue-local time, not their own browser's timezone.
export function formatInTimeZone(isoString, timeZone, options = {}) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: timeZone || 'UTC',
    timeZoneName: 'short',
    ...options,
  });
}

export function guessTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function offsetLabel(minutes) {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `GMT${sign}${h}:${m}`;
}

// Full list, each with its current UTC offset in the label and sorted by
// that offset (then name) — the layout used by Google Calendar / most
// event tools, so it reads familiar in a dropdown.
export function getTimezoneOptions() {
  let zones;
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
  }
  const now = new Date();
  return zones
    .map((zone) => {
      const offset = getTimezoneOffsetMinutes(zone, now);
      return { value: zone, offset, label: `(${offsetLabel(offset)}) ${zone.replace(/_/g, ' ')}` };
    })
    .sort((a, b) => a.offset - b.offset || a.value.localeCompare(b.value));
}
