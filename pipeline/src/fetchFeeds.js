import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDS_PATH = path.join(__dirname, '../config/feeds.json');
const STATE_PATH = path.join(__dirname, '../../data/state.json');

const FEED_TIMEOUT_MS = 15000;
const parser = new Parser({ timeout: FEED_TIMEOUT_MS });

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms fetching "${label}"`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function loadFeedsConfig() {
  const raw = await readFile(FEEDS_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function loadLastRunTimestamp() {
  try {
    const raw = await readFile(STATE_PATH, 'utf-8');
    const state = JSON.parse(raw);
    return state.lastRunAt ? new Date(state.lastRunAt) : new Date(0);
  } catch {
    return new Date(0);
  }
}

// Day boundary in UTC, matching how the archive already buckets articles
// into per-day files (dayKey = toISOString().slice(0, 10)) — using a
// different "today" here would disagree with the archive about what counts
// as today's content.
function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

function extractSummary(feedItem) {
  return feedItem.contentSnippet || feedItem.summary || feedItem.content || null;
}

async function fetchOneFeed(feedConfig, sinceDate) {
  const items = [];
  try {
    const feed = await withTimeout(parser.parseURL(feedConfig.url), FEED_TIMEOUT_MS, feedConfig.sourceName);
    console.log(`[fetchFeeds] OK: ${feedConfig.sourceName} (${feed.items?.length ?? 0} item(s) in feed)`);
    const maxAllowedDate = new Date(Date.now() + 5 * 60 * 1000); // small clock-skew tolerance
    for (const item of feed.items ?? []) {
      const pubDate = item.isoDate || item.pubDate || null;
      if (pubDate && new Date(pubDate) <= sinceDate) continue;
      if (!item.title || !item.link) continue;

      // Some feeds (e.g. sponsored/scheduled content) publish items dated
      // in the future. News can't happen ahead of time, and letting these
      // through would let them sort above everything genuinely current.
      if (pubDate && new Date(pubDate) > maxAllowedDate) {
        console.log(`[fetchFeeds] Skipping future-dated item from "${feedConfig.sourceName}": "${item.title}" (${pubDate})`);
        continue;
      }

      items.push({
        title: item.title.trim(),
        summary: extractSummary(item),
        link: item.link.trim(),
        pubDate: pubDate ? new Date(pubDate).toISOString() : null,
        sourceName: feedConfig.sourceName,
      });
    }
  } catch (err) {
    console.error(`[fetchFeeds] Failed to fetch "${feedConfig.sourceName}" (${feedConfig.url}): ${err.message}`);
  }
  return items;
}

export async function fetchAllFeeds() {
  const feedsConfig = await loadFeedsConfig();
  const lastRunAt = await loadLastRunTimestamp();
  const todayStart = startOfTodayUTC();

  // Only today's posts, and only what's new since the last run — whichever
  // of the two is more recent wins. In normal hourly operation the
  // checkpoint is always the binding constraint (today already started
  // hours ago). It only matters after a long gap: without this, resuming
  // from a stale checkpoint would dump in a full day-plus backlog instead
  // of just today's posts.
  const sinceDate = lastRunAt > todayStart ? lastRunAt : todayStart;
  if (sinceDate === todayStart && lastRunAt < todayStart) {
    console.log(`[fetchFeeds] Last run (${lastRunAt.toISOString()}) was before today — clamping to today's start (${todayStart.toISOString()}) instead of pulling the older backlog.`);
  }

  const results = await Promise.all(
    feedsConfig.map((feedConfig) => fetchOneFeed(feedConfig, sinceDate))
  );

  return results.flat();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  fetchAllFeeds()
    .then((items) => {
      console.log(`[fetchFeeds] Fetched ${items.length} new item(s) across all feeds.`);
      console.log(items.slice(0, 5));
    })
    .catch((err) => {
      console.error('[fetchFeeds] Fatal error:', err);
      process.exit(1);
    });
}
