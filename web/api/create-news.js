import { randomUUID } from 'node:crypto';
import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { parseDataUrl } from './_lib/image.js';

const LATEST_COUNT = 60;

function dayKeyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { title, content, tags, image } = req.body ?? {};

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const parsedImage = image ? parseDataUrl(image) : null;

  const now = new Date();
  const id = randomUUID();
  const article = {
    id,
    title: title.trim(),
    content: content.trim(),
    tags: tagList,
    source: 'Admin',
    origin: 'manual',
    link: null,
    isDuplicateOf: null,
    imagePath: parsedImage ? `data/articles/images/${id}.${parsedImage.ext}` : null,
    pubDate: now.toISOString(),
    fetchedAt: now.toISOString(),
  };

  const indexEntry = {
    id: article.id,
    title: article.title,
    tags: article.tags,
    source: article.source,
    origin: article.origin,
    hasContent: true,
    imagePath: article.imagePath,
    pubDate: article.pubDate,
  };

  try {
    const octokit = getOctokit();
    const cfg = repoConfig();
    const dayPath = `data/articles/${dayKeyFromDate(now)}.json`;
    const indexPath = 'data/index.json';
    const latestPath = 'data/latest.json';

    const [dayArticles, index] = await Promise.all([
      readJsonFile(octokit, cfg, dayPath, []),
      readJsonFile(octokit, cfg, indexPath, []),
    ]);

    const newDayArticles = [...dayArticles, article];
    const newIndex = [...index, indexEntry];

    const sorted = [...newIndex].sort((a, b) => new Date(b.pubDate ?? 0) - new Date(a.pubDate ?? 0));
    const newLatest = sorted.slice(0, LATEST_COUNT).map((entry) => (entry.id === article.id ? article : entry));

    const files = [
      { path: dayPath, content: JSON.stringify(newDayArticles, null, 2) },
      { path: indexPath, content: JSON.stringify(newIndex, null, 2) },
      { path: latestPath, content: JSON.stringify(newLatest, null, 2) },
    ];
    if (parsedImage) {
      files.push({ path: article.imagePath, content: parsedImage.base64, encoding: 'base64' });
    }

    await commitFiles(octokit, cfg, files, `feat: manual article "${article.title}"`);

    return res.status(200).json({ success: true, id: article.id });
  } catch (err) {
    console.error('[create-news] Failed:', err);
    return res.status(500).json({ error: 'Failed to publish article. See server logs for details.' });
  }
}
