import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { dayKeyFromDate } from './_lib/dayKey.js';

const LATEST_COUNT = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { id, title, content, tags } = req.body ?? {};
  if (!id || !title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'id, title and content are required.' });
  }
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];

  try {
    const octokit = getOctokit();
    const cfg = repoConfig();
    const indexPath = 'data/index.json';
    const latestPath = 'data/latest.json';

    const index = await readJsonFile(octokit, cfg, indexPath, []);
    const indexEntry = index.find((a) => a.id === id);
    if (!indexEntry) return res.status(404).json({ error: 'Article not found.' });
    if (indexEntry.origin !== 'manual') {
      return res.status(403).json({ error: 'Only manually-created posts can be edited.' });
    }

    const dayPath = `data/articles/${dayKeyFromDate(indexEntry.pubDate)}.json`;
    const dayArticles = await readJsonFile(octokit, cfg, dayPath, []);
    const articleIdx = dayArticles.findIndex((a) => a.id === id);
    if (articleIdx === -1) return res.status(404).json({ error: 'Article not found in archive.' });

    const updatedArticle = { ...dayArticles[articleIdx], title: title.trim(), content: content.trim(), tags: tagList };
    dayArticles[articleIdx] = updatedArticle;

    const updatedIndex = index.map((a) => (a.id === id ? { ...a, title: updatedArticle.title, tags: tagList } : a));

    const latest = await readJsonFile(octokit, cfg, latestPath, []);
    const latestHasEntry = latest.some((a) => a.id === id);
    const updatedLatest = latestHasEntry ? latest.map((a) => (a.id === id ? updatedArticle : a)) : latest;

    const files = [
      { path: dayPath, content: JSON.stringify(dayArticles, null, 2) },
      { path: indexPath, content: JSON.stringify(updatedIndex, null, 2) },
    ];
    if (latestHasEntry) {
      files.push({ path: latestPath, content: JSON.stringify(updatedLatest.slice(0, LATEST_COUNT), null, 2) });
    }

    await commitFiles(octokit, cfg, files, `chore: edit post "${updatedArticle.title}"`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[update-news] Failed:', err);
    return res.status(500).json({ error: 'Failed to update post. See server logs for details.' });
  }
}
