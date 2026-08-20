import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { dayKeyFromDate } from './_lib/dayKey.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { id } = req.body ?? {};
  if (!id) return res.status(400).json({ error: 'id is required.' });

  try {
    const octokit = getOctokit();
    const cfg = repoConfig();
    const indexPath = 'data/index.json';
    const latestPath = 'data/latest.json';

    const index = await readJsonFile(octokit, cfg, indexPath, []);
    const indexEntry = index.find((a) => a.id === id);
    if (!indexEntry) return res.status(404).json({ error: 'Article not found.' });
    // Any post can be deleted, not just manually-created ones — the Needs
    // Content page needs to be able to discard RSS articles the admin
    // doesn't want to bother writing content for.

    const dayPath = `data/articles/${dayKeyFromDate(indexEntry.pubDate)}.json`;
    const dayArticles = await readJsonFile(octokit, cfg, dayPath, []);
    const updatedDayArticles = dayArticles.filter((a) => a.id !== id);

    const updatedIndex = index.filter((a) => a.id !== id);

    const latest = await readJsonFile(octokit, cfg, latestPath, []);
    const latestHasEntry = latest.some((a) => a.id === id);
    const updatedLatest = latest.filter((a) => a.id !== id);

    const files = [
      { path: dayPath, content: JSON.stringify(updatedDayArticles, null, 2) },
      { path: indexPath, content: JSON.stringify(updatedIndex, null, 2) },
    ];
    if (latestHasEntry) {
      files.push({ path: latestPath, content: JSON.stringify(updatedLatest, null, 2) });
    }

    await commitFiles(octokit, cfg, files, `chore: delete post "${indexEntry.title}"`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-news] Failed:', err);
    return res.status(500).json({ error: 'Failed to delete post. See server logs for details.' });
  }
}
