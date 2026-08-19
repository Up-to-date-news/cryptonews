import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchAllFeeds } from './fetchFeeds.js';

function hashLink(link) {
  return createHash('sha256').update(link).digest('hex').slice(0, 16);
}

export function normalizeItem(rawItem) {
  const summary = rawItem.summary ? rawItem.summary.trim() : null;

  return {
    id: hashLink(rawItem.link),
    title: rawItem.title,
    summary,
    hasSummary: Boolean(summary),
    link: rawItem.link,
    source: rawItem.sourceName,
    tags: [],
    origin: 'rss',
    pubDate: rawItem.pubDate,
    fetchedAt: new Date().toISOString(),
  };
}

export function normalizeItems(rawItems) {
  return rawItems.map(normalizeItem);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  fetchAllFeeds()
    .then((rawItems) => {
      const normalized = normalizeItems(rawItems);
      console.log(`[normalize] Normalized ${normalized.length} item(s).`);
      console.log(normalized.slice(0, 5));
    })
    .catch((err) => {
      console.error('[normalize] Fatal error:', err);
      process.exit(1);
    });
}
