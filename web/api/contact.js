import nodemailer from 'nodemailer';

// Recipient lives only here, in server-only code that never ships to the
// browser — this file runs exclusively on Vercel's serverless runtime.
const CONTACT_TO = 'moovardesign@gmail.com';

const REASON_LABELS = {
  advertisement: 'For advertisement',
  report: 'Report admin (AI)',
  team: 'For contact team',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, city, country, company, reason, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('[contact] GMAIL_USER / GMAIL_APP_PASSWORD not configured on the server.');
    return res.status(500).json({ error: 'Contact form is not configured yet. Please try again later.' });
  }

  const reasonLabel = REASON_LABELS[reason] ?? 'General';

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Up to Date Crypto News — contact form" <${process.env.GMAIL_USER}>`,
      to: CONTACT_TO,
      replyTo: email.trim(),
      subject: `[Contact] ${reasonLabel} — ${name.trim()}`,
      text: [
        `Reason: ${reasonLabel}`,
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        city?.trim() ? `City: ${city.trim()}` : null,
        country?.trim() ? `Country: ${country.trim()}` : null,
        company?.trim() ? `Company: ${company.trim()}` : null,
        '',
        message.trim(),
      ].filter(Boolean).join('\n'),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[contact] Failed to send:', err);
    return res.status(500).json({ error: 'Failed to send your message. See server logs for details.' });
  }
}
