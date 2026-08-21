const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');

function slugify(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '') || 'article';
}

// Collisions are rare (two articles sharing an exact title) but not
// impossible with wire-service headlines run through multiple RSS feeds —
// disambiguate with the publish date first, and only fall back to the id
// (guaranteed unique) if even that still collides same-day.
function uniqueSlug(title, pubDate, id, usedSlugs) {
  const base = slugify(title);
  if (!usedSlugs.has(base)) return base;

  const dayPart = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : '';
  const withDate = dayPart ? `${base}-${dayPart}` : base;
  if (!usedSlugs.has(withDate)) return withDate;

  return `${withDate}-${(id || '').slice(0, 6)}`;
}

export { slugify, uniqueSlug };
