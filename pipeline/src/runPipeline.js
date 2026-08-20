import { fetchAllFeeds } from './fetchFeeds.js';
import { normalizeItems } from './normalize.js';
import { dedupeItems } from './dedupe.js';
import { enrichItems } from './enrich.js';
import { writeBatch, finalizeRun, getExistingIndexIds } from './writeOutput.js';

// Small enough that a CI kill mid-batch loses at most this many items'
// worth of Gemini calls, but large enough not to thrash the embedding
// model or add excessive per-batch overhead.
const BATCH_SIZE = 15;

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

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function main() {
  const rawItems = await runStep('fetchFeeds', () => fetchAllFeeds());
  console.log(`[runPipeline] ${rawItems.length} new raw item(s) fetched.`);
  if (rawItems.length === 0) {
    console.log('[runPipeline] Nothing new to process. Exiting.');
    await finalizeRun();
    return;
  }

  const normalized = await runStep('normalize', () => normalizeItems(rawItems));
  const deduped = await runStep('dedupe', () => dedupeItems(normalized));

  // A previous run against this same backlog may have been killed after
  // writing some items but before reaching finalizeRun() (so state.json's
  // checkpoint never advanced and fetchFeeds re-fetched them). Skip
  // re-enriching (and re-spending Gemini calls on) anything already
  // sitting in the archive from that partial attempt.
  const alreadyArchived = await getExistingIndexIds();
  const toProcess = deduped.filter((item) => item.isDuplicateOf !== null || !alreadyArchived.has(item.id));
  const skipped = deduped.length - toProcess.length;
  if (skipped > 0) {
    console.log(`[runPipeline] Skipping ${skipped} item(s) already archived by a prior partial run.`);
  }

  const batches = chunk(toProcess, BATCH_SIZE);
  console.log(`[runPipeline] Processing ${toProcess.length} item(s) in ${batches.length} batch(es) of up to ${BATCH_SIZE}.`);

  let totalPublished = 0;
  let totalIndexed = null;

  for (let i = 0; i < batches.length; i++) {
    const label = `batch ${i + 1}/${batches.length}`;
    const enriched = await runStep(`enrich ${label}`, () => enrichItems(batches[i]));
    // Written to disk immediately so a kill after this point doesn't lose
    // this batch's work, even though the checkpoint isn't advanced yet.
    const result = await runStep(`writeOutput ${label}`, () => writeBatch(enriched));
    totalPublished += result.publishedCount ?? 0;
    if (result.totalIndexed != null) totalIndexed = result.totalIndexed;
    console.log(`[runPipeline] ${label} done. Published ${result.publishedCount ?? 0} article(s).`);
  }

  // Only advance the checkpoint once every batch has actually been
  // attempted — advancing it earlier would let a mid-run kill silently
  // drop whatever hadn't been reached yet (next run's "since" filter
  // would exclude items that were never actually processed).
  await finalizeRun();

  console.log(`[runPipeline] Done. Published ${totalPublished} article(s) this run. Archive now has ${totalIndexed ?? 'an unchanged number of'} total.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[runPipeline] Fatal error, run aborted:', err);
    process.exit(1);
  });
