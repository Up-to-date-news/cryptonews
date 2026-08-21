import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { id, ids } = req.body ?? {};
  const idList = Array.isArray(ids) && ids.length > 0 ? ids : id ? [id] : [];
  if (idList.length === 0) return res.status(400).json({ error: 'id or ids is required.' });

  try {
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
  } catch (err) {
    console.error('[delete-event] Failed:', err);
    return res.status(500).json({ error: 'Failed to delete event(s). See server logs for details.' });
  }
}
