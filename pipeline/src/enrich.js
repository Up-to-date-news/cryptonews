import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USAGE_LOG_PATH = path.join(__dirname, '../../data/ai-usage-log.json');
// Stable alias Google keeps pointed at their current fast/cheap model —
// avoids breakage as dated model names (e.g. gemini-1.5-flash) get retired.
const MODEL_NAME = 'gemini-flash-lite-latest';

// Free tier is capped at 15 requests/minute for this model. Spacing calls
// 4.2s apart keeps us under that even with clock jitter, no burst needed
// since a 3-4hr fetch cycle has plenty of time to work through the backlog.
const MIN_REQUEST_INTERVAL_MS = 4200;
const MAX_RETRIES = 3;

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

async function logUsage(count) {
  const today = new Date().toISOString().slice(0, 10);
  let log = {};
  try {
    log = JSON.parse(await readFile(USAGE_LOG_PATH, 'utf-8'));
  } catch {
    log = {};
  }
  log[today] = (log[today] ?? 0) + count;
  await writeFile(USAGE_LOG_PATH, JSON.stringify(log, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelayMs(err) {
  const match = /retry in (\d+(?:\.\d+)?)s/i.exec(err.message ?? '');
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : null;
}

async function generateContent(item) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  const result = await model.generateContent(buildPrompt(item));
  const parsed = JSON.parse(result.response.text());
  return {
    content: parsed.content?.trim() ?? '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => t.trim()).filter(Boolean) : [],
  };
}

async function generateContentWithRetry(item) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateContent(item);
    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.status === 429;
      if (!isRateLimit || attempt === MAX_RETRIES) throw err;

      const delay = extractRetryDelayMs(err) ?? MIN_REQUEST_INTERVAL_MS * 2 ** attempt;
      console.error(`[enrich] Rate limited on "${item.title}", retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delay);
    }
  }
}

export async function enrichItems(dedupedItems) {
  const toEnrich = dedupedItems.filter((item) => item.isDuplicateOf === null);
  let successCount = 0;

  for (const item of toEnrich) {
    try {
      const result = await generateContentWithRetry(item);
      item.content = result.content;
      item.tags = result.tags;
      successCount++;
    } catch (err) {
      console.error(`[enrich] Failed to generate content for "${item.title}": ${err.message}`);
      item.content = null;
    }
    await sleep(MIN_REQUEST_INTERVAL_MS);
  }

  if (successCount > 0) await logUsage(successCount);

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
