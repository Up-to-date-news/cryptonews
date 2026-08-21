import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta.js';

const REASONS = [
  { value: 'advertisement', label: 'For advertisement' },
  { value: 'report', label: 'Report admin (AI)' },
  { value: 'team', label: 'For contact team' },
];

const INITIAL_FORM = {
  name: '',
  email: '',
  city: '',
  country: '',
  company: '',
  reason: REASONS[0].value,
  message: '',
};

export default function ContactPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('idle'); // idle | submitting | error | success
  const [errorMessage, setErrorMessage] = useState('');

  usePageMeta({
    title: 'Contact Us',
    description: 'Get in touch with Up to Date Crypto News — advertising inquiries, corrections, and general contact.',
    path: '/contact',
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);

      setStatus('success');
      setForm(INITIAL_FORM);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  }

  return (
    <div className="terms-page">
      <Link to="/" className="back-link">← Back</Link>
      <h1>Contact us</h1>

      {status === 'success' ? (
        <p className="admin-status success">Thanks — your message has been sent. We'll get back to you if needed.</p>
      ) : (
        <form onSubmit={handleSubmit} className="admin-form">
          <label>
            Name
            <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
          </label>

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
          </label>

          <label>
            City
            <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          </label>

          <label>
            Country
            <input type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          </label>

          <label>
            Company
            <input type="text" value={form.company} onChange={(e) => updateField('company', e.target.value)} />
          </label>

          <label>
            Reason
            <select value={form.reason} onChange={(e) => updateField('reason', e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <label>
            Message
            <textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} rows={6} required />
          </label>

          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending…' : 'Submit'}
          </button>
          {status === 'error' && <p className="admin-status error">{errorMessage}</p>}
        </form>
      )}
    </div>
  );
}
