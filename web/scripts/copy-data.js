// Copies the repo-root /data folder into web/public/data so Vite can serve
// it. Run before dev/build rather than relying on a symlink or junction —
// those don't survive a fresh git checkout on Linux CI/deploy machines,
// so a real copy is the only thing that works identically everywhere.
import { cpSync, existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(__dirname, '../../data');
const DEST = path.join(__dirname, '../public/data');
const SITEMAP_DEST = path.join(__dirname, '../public/sitemap.xml');
const SITE_URL = 'https://cryptonews-peach.vercel.app';

if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true, force: true });
}
cpSync(SOURCE, DEST, { recursive: true });

console.log('[copy-data] Synced /data -> web/public/data');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function urlEntry(loc, lastmod) {
  return `  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}  </url>`;
}

// Runs on every build (i.e. every deploy — pipeline runs and admin-panel
// writes both trigger one), so the sitemap is never more stale than the
// data itself, with no separate generation trigger to keep in sync.
function generateSitemap() {
  const index = readJsonSafe(path.join(DEST, 'index.json'));
  const events = readJsonSafe(path.join(DEST, 'events/index.json'));

  const staticEntries = [
    urlEntry(`${SITE_URL}/`),
    urlEntry(`${SITE_URL}/events`),
    urlEntry(`${SITE_URL}/contact`),
    urlEntry(`${SITE_URL}/terms`),
  ];

  const articleEntries = index
    .filter((a) => a.slug)
    .map((a) => urlEntry(`${SITE_URL}/article/${a.slug}`, a.pubDate?.slice(0, 10)));

  const eventEntries = events
    .filter((e) => e.slug)
    .map((e) => urlEntry(`${SITE_URL}/event/${e.slug}`, e.fetchedAt?.slice(0, 10)));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...articleEntries, ...eventEntries].join('\n')}\n</urlset>\n`;

  writeFileSync(SITEMAP_DEST, xml);
  console.log(`[copy-data] Generated sitemap.xml with ${staticEntries.length + articleEntries.length + eventEntries.length} URLs`);
}

generateSitemap();
