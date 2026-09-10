// Vercel attaches these geo headers to every request at no cost — no
// external IP-lookup service or API key needed. Locally (vercel dev)
// they're absent, so the frontend's caller should treat a missing/empty
// response as "unknown" and fall back to English.
export default function handler(req, res) {
  const country = req.headers['x-vercel-ip-country'] || null;
  const region = req.headers['x-vercel-ip-country-region'] || null;
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ country, region });
}
