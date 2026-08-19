import { safeEqual, issueToken } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin credentials are not configured on the server.' });
  }

  const { username, password } = req.body ?? {};

  const validUsername = username && safeEqual(username, process.env.ADMIN_USERNAME);
  const validPassword = password && safeEqual(password, process.env.ADMIN_PASSWORD);

  if (!validUsername || !validPassword) {
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
