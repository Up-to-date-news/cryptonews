import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const ARTICLES_DIR = path.join(DATA_DIR, 'articles');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');
const LATEST_PATH = path.join(DATA_DIR, 'latest.json');
const STATE_PATH = path.join(DATA_DIR, 'state.json');
const FEEDS_CONFIG_PATH = path.join(__dirname, '../config/feeds.json');
const FEEDS_PUBLIC_PATH = path.join(DATA_DIR, 'feeds.json');

const LATEST_COUNT = 60;

async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function dayKey(item) {
  const date = item.pubDate ? new Date(item.pubDate) : new Date(item.fetchedAt);
  return date.toISOString().slice(0, 10);
}

async function appendToDayFiles(publishedItems) {
  const byDay = new Map();
  for (const item of publishedItems) {
    const key = dayKey(item);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(item);
  }

  await mkdir(ARTICLES_DIR, { recursive: true });

  for (const [day, items] of byDay) {
    const dayFilePath = path.join(ARTICLES_DIR, `${day}.json`);
    const existing = await readJsonSafe(dayFilePath, []);
    const existingIds = new Set(existing.map((a) => a.id));
    const merged = [...existing, ...items.filter((a) => !existingIds.has(a.id))];
    await writeFile(dayFilePath, JSON.stringify(merged, null, 2));
  }
}

async function updateIndex(publishedItems) {
  const existing = await readJsonSafe(INDEX_PATH, []);
  const existingIds = new Set(existing.map((a) => a.id));

  const newEntries = publishedItems
    .filter((item) => !existingIds.has(item.id))
    .map((item) => ({
      id: item.id,
      title: item.title,
      tags: item.tags ?? [],
      source: item.source,
      origin: item.origin ?? 'rss',
      pubDate: item.pubDate,
    }));

  const merged = [...existing, ...newEntries];
  await writeFile(INDEX_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

async function rebuildLatest(fullIndex, publishedItems) {
  const byId = new Map(publishedItems.map((item) => [item.id, item]));
  const sorted = [...fullIndex].sort((a, b) => new Date(b.pubDate ?? 0) - new Date(a.pubDate ?? 0));
  const recent = sorted.slice(0, LATEST_COUNT).map((entry) => byId.get(entry.id) ?? entry);
  await writeFile(LATEST_PATH, JSON.stringify(recent, null, 2));
}

async function updateState() {
  await writeFile(STATE_PATH, JSON.stringify({ lastRunAt: new Date().toISOString() }, null, 2));
}

// Publishes a copy of the feeds config into /data so the (static, public)
// frontend can read the feed count for the admin dashboard — the pipeline's
// own config directory isn't served to the browser.
async function publishFeedsConfig() {
  const feeds = await readJsonSafe(FEEDS_CONFIG_PATH, []);
  await writeFile(FEEDS_PUBLIC_PATH, JSON.stringify(feeds, null, 2));
}

export async function writeOutput(enrichedItems) {
  const publishedItems = enrichedItems.filter((item) => item.isDuplicateOf === null);

  await appendToDayFiles(publishedItems);
  const fullIndex = await updateIndex(publishedItems);
  await rebuildLatest(fullIndex, publishedItems);
  await updateState();
  await publishFeedsConfig();

  return { publishedCount: publishedItems.length, totalIndexed: fullIndex.length };
}
