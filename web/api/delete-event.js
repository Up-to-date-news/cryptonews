import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';

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
    const indexPath = 'data/events/index.json';

    const events = await readJsonFile(octokit, cfg, indexPath, []);
    const target = events.find((e) => e.id === id);
    if (!target) return res.status(404).json({ error: 'Event not found.' });

    const updated = events.filter((e) => e.id !== id);

    await commitFiles(
      octokit,
      cfg,
      [{ path: indexPath, content: JSON.stringify(updated, null, 2) }],
      `chore: delete event "${target.title}"`
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-event] Failed:', err);
    return res.status(500).json({ error: 'Failed to delete event. See server logs for details.' });
  }
}
