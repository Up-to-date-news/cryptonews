import { fetchAllFeeds } from './fetchFeeds.js';
import { normalizeItems } from './normalize.js';
import { dedupeItems } from './dedupe.js';
import { enrichItems } from './enrich.js';
import { writeOutput } from './writeOutput.js';

async function runStep(label, fn) {
  console.log(`[runPipeline] Starting: ${label}`);
  try {
    const result = await fn();
    console.log(`[runPipeline] Finished: ${label}`);
    return result;
  } catch (err) {
    console.error(`[runPipeline] Step failed: ${label}`, err);
    throw err;
  }
}

async function main() {
  const rawItems = await runStep('fetchFeeds', () => fetchAllFeeds());
  console.log(`[runPipeline] ${rawItems.length} new raw item(s) fetched.`);

  if (rawItems.length === 0) {
    console.log('[runPipeline] Nothing new to process. Exiting.');
    return;
  }

  const normalized = await runStep('normalize', () => normalizeItems(rawItems));
  const deduped = await runStep('dedupe', () => dedupeItems(normalized));
  const enriched = await runStep('enrich', () => enrichItems(deduped));
  const summary = await runStep('writeOutput', () => writeOutput(enriched));

  console.log(`[runPipeline] Done. Published ${summary.publishedCount} article(s). Archive now has ${summary.totalIndexed} total.`);
}

main().catch((err) => {
  console.error('[runPipeline] Fatal error, run aborted:', err);
  process.exit(1);
});
