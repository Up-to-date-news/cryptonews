const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');
const MAX_LENGTH = 100;

function slugify(title) {
  const full = (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (full.length <= MAX_LENGTH) return full || 'article';

  // Cut back to the last full word instead of chopping mid-word (which
  // produced ugly, meaningless-looking tails like "...annually-c").
  const truncated = full.slice(0, MAX_LENGTH);
  const lastHyphen = truncated.lastIndexOf('-');
  return (lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated) || 'article';
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
