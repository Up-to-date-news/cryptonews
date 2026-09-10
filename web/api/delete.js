import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { dayKeyFromDate } from './_lib/dayKey.js';

// Merges what were formerly delete-news.js and delete-event.js into one
// route, dispatched by `type` — Vercel's Hobby plan caps a deployment at
// 12 serverless functions, and separate files for these two nearly
// identical handlers was one function more than the budget allowed.
async function deleteNews(req, res, idList) {
  const octokit = getOctokit();
  const cfg = repoConfig();
  const indexPath = 'data/index.json';
  const latestPath = 'data/latest.json';

  const index = await readJsonFile(octokit, cfg, indexPath, []);
  const idSet = new Set(idList);
  const entriesToDelete = index.filter((a) => idSet.has(a.id));
  if (entriesToDelete.length === 0) return res.status(404).json({ error: 'No matching articles found.' });
  // Any post can be deleted, not just manually-created ones — the Needs
  // Content / AI Posts pages need to be able to discard RSS articles.

  // A bulk selection can span multiple day-files — touch only the ones
  // that actually contain a deleted id.
  const dayPaths = new Set(entriesToDelete.map((entry) => `data/articles/${dayKeyFromDate(entry.pubDate)}.json`));

  const files = [];
  for (const dayPath of dayPaths) {
    const dayArticles = await readJsonFile(octokit, cfg, dayPath, []);
    const updatedDayArticles = dayArticles.filter((a) => !idSet.has(a.id));
    files.push({ path: dayPath, content: JSON.stringify(updatedDayArticles, null, 2) });
  }

  const updatedIndex = index.filter((a) => !idSet.has(a.id));
  files.push({ path: indexPath, content: JSON.stringify(updatedIndex, null, 2) });

  const latest = await readJsonFile(octokit, cfg, latestPath, []);
  if (latest.some((a) => idSet.has(a.id))) {
    const updatedLatest = latest.filter((a) => !idSet.has(a.id));
    files.push({ path: latestPath, content: JSON.stringify(updatedLatest, null, 2) });
  }

  const commitMessage = entriesToDelete.length === 1
    ? `chore: delete post "${entriesToDelete[0].title}"`
    : `chore: delete ${entriesToDelete.length} posts`;

  await commitFiles(octokit, cfg, files, commitMessage);
  return res.status(200).json({ success: true, deletedCount: entriesToDelete.length });
}

async function deleteEvent(req, res, idList) {
  const octokit = getOctokit();
  const cfg = repoConfig();
  const indexPath = 'data/events/index.json';

  const events = await readJsonFile(octokit, cfg, indexPath, []);
  const idSet = new Set(idList);
  const targets = events.filter((e) => idSet.has(e.id));
  if (targets.length === 0) return res.status(404).json({ error: 'No matching events found.' });

  const updated = events.filter((e) => !idSet.has(e.id));

  const commitMessage = targets.length === 1
    ? `chore: delete event "${targets[0].title}"`
    : `chore: delete ${targets.length} events`;

  await commitFiles(
    octokit,
    cfg,
    [{ path: indexPath, content: JSON.stringify(updated, null, 2) }],
    commitMessage
  );

  return res.status(200).json({ success: true, deletedCount: targets.length });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { type, id, ids } = req.body ?? {};
  if (type !== 'news' && type !== 'event') {
    return res.status(400).json({ error: 'type must be "news" or "event".' });
  }

  const idList = Array.isArray(ids) && ids.length > 0 ? ids : id ? [id] : [];
  if (idList.length === 0) return res.status(400).json({ error: 'id or ids is required.' });

  try {
    if (type === 'news') return await deleteNews(req, res, idList);
    return await deleteEvent(req, res, idList);
  } catch (err) {
    console.error(`[delete] Failed (type=${type}):`, err);
    return res.status(500).json({ error: `Failed to delete ${type}(s). See server logs for details.` });
  }
}
