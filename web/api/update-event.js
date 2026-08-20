import { requireAuth } from './_lib/auth.js';
import { getOctokit, repoConfig, readJsonFile, commitFiles } from './_lib/github.js';
import { parseDataUrl } from './_lib/image.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res)) return;

  const { id, title, startDate, endDate, location, mode, pricing, link, description, image } = req.body ?? {};
  if (!id || !title?.trim() || !startDate) {
    return res.status(400).json({ error: 'id, title and start date are required.' });
  }

  const parsedImage = image ? parseDataUrl(image) : null;

  try {
    const octokit = getOctokit();
    const cfg = repoConfig();
    const indexPath = 'data/events/index.json';

    const events = await readJsonFile(octokit, cfg, indexPath, []);
    const eventIdx = events.findIndex((e) => e.id === id);
    if (eventIdx === -1) return res.status(404).json({ error: 'Event not found.' });

    const existing = events[eventIdx];
    const imagePath = parsedImage ? `data/events/images/${id}.${parsedImage.ext}` : existing.imagePath;

    const updatedEvent = {
      ...existing,
      title: title.trim(),
      location: location?.trim() || null,
      mode: ['online', 'hybrid'].includes(mode) ? mode : 'offline',
      pricing: ['paid', 'both'].includes(pricing) ? pricing : 'free',
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      link: link?.trim() || null,
      description: description?.trim() || null,
      imagePath,
    };
    events[eventIdx] = updatedEvent;

    const files = [{ path: indexPath, content: JSON.stringify(events, null, 2) }];
    if (parsedImage) {
      files.push({ path: imagePath, content: parsedImage.base64, encoding: 'base64' });
    }

    await commitFiles(octokit, cfg, files, `chore: edit event "${updatedEvent.title}"`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[update-event] Failed:', err);
    return res.status(500).json({ error: 'Failed to update event. See server logs for details.' });
  }
}
