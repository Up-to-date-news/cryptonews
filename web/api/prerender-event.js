import { resolveBaseUrl, fetchJson, escapeHtml, renderPrerenderPage, sendPrerenderPage } from './_lib/prerender.js';

const SITE_URL = 'https://cryptonews-peach.vercel.app';

const ATTENDANCE_MODE = {
  online: 'https://schema.org/OnlineEventAttendanceMode',
  offline: 'https://schema.org/OfflineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
};

export default async function handler(req, res) {
  const slug = req.query?.slug;
  if (!slug) {
    res.status(400).send('Missing slug');
    return;
  }

  const base = resolveBaseUrl(req);
  const events = await fetchJson(`${base}/data/events/index.json`, []);
  const event = events.find((e) => e.slug === slug);
  if (!event) {
    res.status(404).send('Event not found');
    return;
  }

  const description = (event.description || '').slice(0, 160);
  const url = `${SITE_URL}/event/${slug}`;
  const image = event.imagePath ? `${SITE_URL}/${event.imagePath}` : `${SITE_URL}/logos/favicon.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || undefined,
    eventAttendanceMode: ATTENDANCE_MODE[event.mode] ?? ATTENDANCE_MODE.offline,
    eventStatus: 'https://schema.org/EventScheduled',
    location: event.location ? { '@type': 'Place', name: event.location, address: event.location } : undefined,
    image: [image],
    url,
    organizer: { '@type': 'Organization', name: 'up to date news', url: SITE_URL },
  };

  const bodyHtml = `
<article>
  <h1>${escapeHtml(event.title)}</h1>
  <p>${escapeHtml(event.location || '')}</p>
  <p>${escapeHtml(event.startDate || '')} – ${escapeHtml(event.endDate || '')} (${escapeHtml(event.timezone || 'UTC')})</p>
  <p>${escapeHtml(event.description || '')}</p>
  ${event.link ? `<p><a href="${escapeHtml(event.link)}">Official event site</a></p>` : ''}
  <p><a href="${escapeHtml(url)}">View on up to date news</a></p>
</article>`;

  const html = renderPrerenderPage({
    title: event.title,
    description,
    url,
    image,
    type: 'article',
    jsonLd,
    bodyHtml,
  });

  sendPrerenderPage(res, html);
}
