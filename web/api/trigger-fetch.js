import { safeEqual } from './_lib/auth.js';
import { getOctokit, repoConfig } from './_lib/github.js';

// Called by an external cron pinger (e.g. cron-job.org) every 15-30 min as
// a reliability backstop — GitHub's own `schedule:` trigger for
// fetch-cycle.yml is best-effort and has been observed to silently skip
// firing for many hours at a time. This forces a workflow_dispatch run
// instead of waiting on GitHub's scheduler.
export default async function handler(req, res) {
  if (!process.env.CRON_TRIGGER_SECRET) {
    return res.status(500).json({ error: 'CRON_TRIGGER_SECRET is not configured on the server.' });
  }

  const secret = req.query.secret;
  if (!secret || !safeEqual(secret, process.env.CRON_TRIGGER_SECRET)) {
    return res.status(401).json({ error: 'Invalid or missing secret.' });
  }

  try {
    const octokit = getOctokit();
    const { owner, repo, branch } = repoConfig();

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: 'fetch-cycle.yml',
      ref: branch,
    });

    return res.status(200).json({ success: true, triggered: 'fetch-cycle.yml' });
  } catch (err) {
    console.error('[trigger-fetch] Failed:', err);
    return res.status(500).json({ error: 'Failed to trigger workflow. See server logs for details.' });
  }
}
