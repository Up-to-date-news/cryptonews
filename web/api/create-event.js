import { randomUUID } from 'node:crypto';
import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { parseDataUrl } from './_lib/image.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { title, startDate, endDate, location, mode, pricing, link, description, image } = req.body ?? {};

  if (!title?.trim() || !startDate) {
    return res.status(400).json({ error: 'Title and start date are required.' });
  }

  const id = randomUUID();
  const parsedImage = image ? parseDataUrl(image) : null;

  const event = {
    id,
    title: title.trim(),
    location: location?.trim() || null,
    mode: ['online', 'hybrid'].includes(mode) ? mode : 'offline',
    pricing: ['paid', 'both'].includes(pricing) ? pricing : 'free',
    startDate: new Date(startDate).toISOString(),
    endDate: endDate ? new Date(endDate).toISOString() : null,
    link: link?.trim() || null,
    description: description?.trim() || null,
    imagePath: parsedImage ? `data/events/images/${id}.${parsedImage.ext}` : null,
    source: 'Admin',
    origin: 'manual',
    fetchedAt: new Date().toISOString(),
  };

  try {
    const octokit = getOctokit();
    const cfg = repoConfig();
    const indexPath = 'data/events/index.json';

    const existing = await readJsonFile(octokit, cfg, indexPath, []);
    const updated = [...existing, event];

    const files = [{ path: indexPath, content: JSON.stringify(updated, null, 2) }];
    if (parsedImage) {
      files.push({ path: event.imagePath, content: parsedImage.base64, encoding: 'base64' });
    }

    await commitFiles(octokit, cfg, files, `feat: event "${event.title}"`);

    return res.status(200).json({ success: true, id: event.id });
  } catch (err) {
    console.error('[create-event] Failed:', err);
    return res.status(500).json({ error: 'Failed to publish event. See server logs for details.' });
  }
}
