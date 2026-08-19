import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@xenova/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join(__dirname, '../../data/index.json');

// Empirically calibrated against title-only MiniLM embeddings: genuinely
// duplicate headlines (same story, different wording) scored ~0.76 cosine
// similarity, unrelated headlines ~0.2. Re-tune as real archive data comes in.
const SIMILARITY_THRESHOLD = 0.72;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let embedderPromise = null;
function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', MODEL_NAME);
  }
  return embedderPromise;
}

function embeddingText(item) {
  return item.summary ? `${item.title}\n${item.summary}` : item.title;
}

async function embed(text) {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already normalized, so dot product == cosine similarity
}

async function loadExistingArchiveItems() {
  try {
    const raw = await readFile(INDEX_PATH, 'utf-8');
    const index = JSON.parse(raw);
    // Manually-written articles aren't sourced from any feed, so they have
    // nothing to be a "duplicate" of — skip them as comparison candidates.
    return Array.isArray(index) ? index.filter((item) => item.origin !== 'manual') : [];
  } catch {
    return [];
  }
}

export async function dedupeItems(normalizedItems) {
  const existingItems = await loadExistingArchiveItems();

  // Embed existing archive items once (index entries carry no summary,
  // so this only catches near-identical titles against history).
  const existingEmbeddings = [];
  for (const existing of existingItems) {
    existingEmbeddings.push({ id: existing.id, vector: await embed(existing.title) });
  }

  const kept = [];
  const keptEmbeddings = [];

  for (const item of normalizedItems) {
    const vector = await embed(embeddingText(item));

    let bestMatch = null;
    let bestScore = -1;

    for (const candidate of [...existingEmbeddings, ...keptEmbeddings]) {
      const score = cosineSimilarity(vector, candidate.vector);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
      item.isDuplicateOf = bestMatch.id;

      const original = kept.find((k) => k.id === bestMatch.id);
      if (original && item.hasSummary && (!original.hasSummary || item.summary.length > (original.summary?.length ?? 0))) {
        original.summary = item.summary;
        original.hasSummary = true;
      }
    } else {
      item.isDuplicateOf = null;
      kept.push(item);
      keptEmbeddings.push({ id: item.id, vector });
    }
  }

  return normalizedItems;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { fetchAllFeeds } = await import('./fetchFeeds.js');
  const { normalizeItems } = await import('./normalize.js');

  const rawItems = await fetchAllFeeds();
  const normalized = normalizeItems(rawItems);
  const deduped = await dedupeItems(normalized);

  const duplicates = deduped.filter((i) => i.isDuplicateOf);
  console.log(`[dedupe] ${deduped.length} item(s) processed, ${duplicates.length} marked as duplicates.`);
  console.log(duplicates.slice(0, 5).map((d) => ({ title: d.title, isDuplicateOf: d.isDuplicateOf })));
}
