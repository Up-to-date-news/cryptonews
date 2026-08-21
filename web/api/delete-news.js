import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { dayKeyFromDate } from './_lib/dayKey.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { id, ids } = req.body ?? {};
  // Accepts either one id (existing single-delete callers) or an ids
  // array (bulk selection) — both delete in a single commit either way,
  // so selecting hundreds of posts doesn't mean hundreds of commits.
  const idList = Array.isArray(ids) && ids.length > 0 ? ids : id ? [id] : [];
  if (idList.length === 0) return res.status(400).json({ error: 'id or ids is required.' });

  try {
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
  } catch (err) {
    console.error('[delete-news] Failed:', err);
    return res.status(500).json({ error: 'Failed to delete post(s). See server logs for details.' });
  }
}
