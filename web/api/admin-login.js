import { safeEqual, issueToken } from './_lib/auth.js';
import { isRateLimited, recordFailedAttempt } from './_lib/rateLimit.js';

// 10 failed attempts per 15 minutes per IP — generous enough that a
// legitimate admin fat-fingering a password isn't locked out, tight
// enough to make scripted brute-forcing impractical.
const RATE_LIMIT = { key: 'admin-login', max: 10, windowMs: 15 * 60 * 1000 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limitStatus = isRateLimited(req, RATE_LIMIT);
  if (limitStatus.limited) {
    res.setHeader('Retry-After', String(limitStatus.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin credentials are not configured on the server.' });
  }

  const { username, password } = req.body ?? {};

  const validUsername = username && safeEqual(username, process.env.ADMIN_USERNAME);
  const validPassword = password && safeEqual(password, process.env.ADMIN_PASSWORD);

  if (!validUsername || !validPassword) {
    recordFailedAttempt(req, RATE_LIMIT);
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  try {
    const token = issueToken();
    return res.status(200).json({ token });
  } catch (err) {
    console.error('[admin-login] Failed:', err);
    return res.status(500).json({ error: 'Login failed. See server logs for details.' });
  }
}
