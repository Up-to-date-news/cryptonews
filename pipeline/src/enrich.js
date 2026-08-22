import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USAGE_LOG_PATH = path.join(__dirname, '../../data/ai-usage-log.json');
// Free-tier daily quota (RPD) is tracked per model, not pooled across
// models — confirmed against the live AI Studio dashboard for this
// project: one model sitting near its limit shows the other still at
// 0 used. So when the first model's day is spent, falling through to a
// second real model gets another independent quota instead of just
// giving up. gemini-flash-lite-latest is a stable alias Google keeps
// pointed at their current fast/cheap model (currently resolves to
// Gemini 3.5 Flash Lite); gemini-3.1-flash-lite is a second, separate
// model confirmed available on this API key via the live models-list
// endpoint. Order matters: try the alias first since it tracks
// Google's recommended default, fall back to the pinned model second.
const MODEL_CHAIN = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];

// Free tier is capped at 15 requests/minute for this model. Spacing calls
// 4.2s apart keeps us under that even with clock jitter, no burst needed
// since a 3-4hr fetch cycle has plenty of time to work through the backlog.
const MIN_REQUEST_INTERVAL_MS = 4200;
const MAX_RETRIES = 3;
// Non-rate-limit failures (timeouts, network blips, a malformed/partial
// response) got zero retries before this — a single random hiccup
// permanently left that article title-only. Most of these are transient,
// so one quick extra try clears them without hammering anything.
const MAX_TRANSIENT_RETRIES = 1;
const TRANSIENT_RETRY_DELAY_MS = 3000;
// Without this, a single stalled Gemini call hangs the whole batch (and
// pipeline) forever with no error and no log line — seen in production as
// the same class of bug that once hung dedupe.js's model download for 2+
// hours. A 45s cap is generous for a 50-80 word JSON response.
const REQUEST_TIMEOUT_MS = 45000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

let genAI = null;
function getClient() {
  if (!genAI) {
    if (!process.env.AI_API_KEY) {
      throw new Error('AI_API_KEY is not set. Copy pipeline/.env.example to pipeline/.env and add your Gemini key.');
    }
    genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
  }
  return genAI;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['content', 'tags'],
};

function buildPrompt(item) {
  const summaryPart = item.summary ? ` Summary: "${item.summary}".` : '';
  return `Given this news headline: "${item.title}".${summaryPart}

Research and write a factual news content piece of 50-80 words covering the main points. Do not invent specific numbers, quotes, or names you are not given — keep it accurate and general where details are uncertain.

Also identify 2-5 tags for this article: the specific companies, organizations, cryptocurrencies/tickers, and countries/regions named or clearly central to the story. Use the commonly recognized short name for each (e.g. "Bitcoin" not "BTC/USD", "United States" not "the U.S. government"). Do not include generic topic words like "crypto", "fintech", "finance", or "news" as tags — only concrete named entities.

Return JSON matching the schema: { "content": string, "tags": string[] }.`;
}

async function logUsage(countsByModel) {
  const today = new Date().toISOString().slice(0, 10);
  let log = {};
  try {
    log = JSON.parse(await readFile(USAGE_LOG_PATH, 'utf-8'));
  } catch {
    log = {};
  }

  let existing = log[today];
  if (typeof existing === 'number') {
    // Pre-fallback log entries are a flat number — all of it was the
    // (only) model in use at the time, so fold it in under that key
    // instead of silently dropping it.
    existing = { [MODEL_CHAIN[0]]: existing };
  } else if (typeof existing !== 'object' || existing === null) {
    existing = {};
  }

  for (const [model, count] of Object.entries(countsByModel)) {
    existing[model] = (existing[model] ?? 0) + count;
  }
  log[today] = existing;
  await writeFile(USAGE_LOG_PATH, JSON.stringify(log, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayMs(err) {
  const match = /retry in (\d+(?:\.\d+)?)s/i.exec(err.message ?? '');
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : null;
}

// The free tier has two separate 429 limits: a per-minute burst limit (15
// RPM, worth retrying — it clears in seconds) and a per-day cap (500/day,
// pointless to retry — it won't clear until Google's daily reset). Google's
// error puts "PerDay" in the quotaId when it's the latter.
class DailyQuotaExceededError extends Error {}

function isDailyQuotaError(err) {
  return /PerDay/i.test(err.message ?? '');
}

async function generateContent(item, modelName) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  const result = await withTimeout(
    model.generateContent(buildPrompt(item)),
    REQUEST_TIMEOUT_MS,
    `generateContent for "${item.title}"`
  );
  const parsed = JSON.parse(result.response.text());
  return {
    content: parsed.content?.trim() ?? '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => t.trim()).filter(Boolean) : [],
  };
}

async function generateContentWithRetry(item, modelName) {
  let rateLimitAttempt = 0;
  let transientAttempt = 0;

  while (true) {
    try {
      return await generateContent(item, modelName);
    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.status === 429;
      if (isRateLimit && isDailyQuotaError(err)) {
        throw new DailyQuotaExceededError(err.message);
      }

      if (isRateLimit) {
        if (rateLimitAttempt === MAX_RETRIES) throw err;
        const delay = extractRetryDelayMs(err) ?? MIN_REQUEST_INTERVAL_MS * 2 ** rateLimitAttempt;
        console.error(`[enrich] Rate limited on "${item.title}" (${modelName}), retrying in ${Math.round(delay / 1000)}s (attempt ${rateLimitAttempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        rateLimitAttempt++;
        continue;
      }

      if (transientAttempt === MAX_TRANSIENT_RETRIES) throw err;
      console.error(`[enrich] Transient error on "${item.title}" (${modelName}: ${err.message}) — retrying once in ${TRANSIENT_RETRY_DELAY_MS / 1000}s`);
      await sleep(TRANSIENT_RETRY_DELAY_MS);
      transientAttempt++;
    }
  }
}

export async function enrichItems(dedupedItems) {
  const toEnrich = dedupedItems.filter((item) => item.isDuplicateOf === null);
  const successCountByModel = {};
  // Sticky across the whole run: once the first model's day is spent, stay
  // on the fallback rather than re-probing the exhausted one per item.
  let modelIndex = 0;

  itemLoop: for (let i = 0; i < toEnrich.length; i++) {
    const item = toEnrich[i];

    while (true) {
      const modelName = MODEL_CHAIN[modelIndex];
      try {
        const result = await generateContentWithRetry(item, modelName);
        item.content = result.content;
        item.tags = result.tags;
        successCountByModel[modelName] = (successCountByModel[modelName] ?? 0) + 1;
        break;
      } catch (err) {
        if (err instanceof DailyQuotaExceededError) {
          if (modelIndex < MODEL_CHAIN.length - 1) {
            modelIndex++;
            console.error(`[enrich] "${modelName}" daily quota exhausted — switching to "${MODEL_CHAIN[modelIndex]}" for the rest of this run.`);
            continue; // retry this same item on the next model
          }
          // Every remaining item would fail the exact same way on every
          // model in the chain — stop spending a round-trip per item.
          const remaining = toEnrich.slice(i);
          console.error(`[enrich] All ${MODEL_CHAIN.length} configured models' daily quota are exhausted — skipping content generation for the remaining ${remaining.length} item(s).`);
          for (const skipped of remaining) skipped.content = null;
          break itemLoop;
        }
        console.error(`[enrich] Failed to generate content for "${item.title}" (${modelName}): ${err.message}`);
        item.content = null;
        break;
      }
    }

    await sleep(MIN_REQUEST_INTERVAL_MS);
  }

  const totalSuccess = Object.values(successCountByModel).reduce((a, b) => a + b, 0);
  if (totalSuccess > 0) await logUsage(successCountByModel);

  return dedupedItems;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { fetchAllFeeds } = await import('./fetchFeeds.js');
  const { normalizeItems } = await import('./normalize.js');
  const { dedupeItems } = await import('./dedupe.js');

  const rawItems = await fetchAllFeeds();
  const normalized = normalizeItems(rawItems).slice(0, 3); // small sample for manual testing
  const deduped = await dedupeItems(normalized);
  const enriched = await enrichItems(deduped);

  console.log(enriched.map((i) => ({ title: i.title, content: i.content, tags: i.tags })));
}
