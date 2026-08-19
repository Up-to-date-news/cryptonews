import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { tag } = req.body ?? {};
  const trimmed = String(tag ?? '').trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'Tag is required.' });
  }

  try {
    const octokit = getOctokit();
    const cfg = repoConfig();
    const tagsPath = 'data/tags.json';

    const existing = await readJsonFile(octokit, cfg, tagsPath, []);
    if (existing.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      return res.status(200).json({ success: true, tags: existing, note: 'Tag already exists.' });
    }

    const updated = [...existing, trimmed];
    await commitFiles(
      octokit,
      cfg,
      [{ path: tagsPath, content: JSON.stringify(updated, null, 2) }],
      `chore: add tag "${trimmed}"`
    );

    return res.status(200).json({ success: true, tags: updated });
  } catch (err) {
    console.error('[add-tag] Failed:', err);
    return res.status(500).json({ error: 'Failed to add tag. See server logs for details.' });
  }
}
