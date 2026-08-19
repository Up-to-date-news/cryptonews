import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function computeMode({ isOffline, isOnline }) {
  if (isOffline && isOnline) return 'hybrid';
  if (isOnline) return 'online';
  return 'offline';
}

export default function AdminEditEventPage() {
  const { id } = useParams();
  const { authFetch } = useAdminAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [existingImagePath, setExistingImagePath] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/data/events/index.json')
      .then((r) => r.json())
      .then((events) => {
        const event = events.find((e) => e.id === id);
        if (!event) throw new Error('Event not found.');
        setForm({
          title: event.title,
          startDate: toDatetimeLocalValue(event.startDate),
          endDate: toDatetimeLocalValue(event.endDate),
          location: event.location ?? '',
          isOffline: event.mode !== 'online',
          isOnline: event.mode === 'online' || event.mode === 'hybrid',
          pricing: event.pricing ?? 'free',
          link: event.link ?? '',
          description: event.description ?? '',
        });
        setExistingImagePath(event.imagePath);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.isOffline && !form.isOnline) {
      setStatus('error');
      setErrorMessage('Select at least one format: in-person or online.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const image = imageFile ? await fileToDataUrl(imageFile) : null;

      const res = await authFetch('/api/update-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...form, mode: computeMode(form), image }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);

      navigate('/admin/events');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  }

  if (loading) return <p className="status-message">Loading…</p>;
  if (loadError) return <p className="status-message error">{loadError}</p>;

  return (
    <div className="admin-page">
      <h1>Edit Event</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          Title
          <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} required />
        </label>

        <label>
          Start date
          <input type="datetime-local" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} required />
        </label>

        <label>
          End date
          <input type="datetime-local" value={form.endDate} onChange={(e) => updateField('endDate', e.target.value)} />
        </label>

        <label>
          Location
          <input type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
        </label>

        <div className="radio-row">
          <span className="admin-form-label">Format (select both for hybrid)</span>
          <label className="radio-option">
            <input type="checkbox" checked={form.isOffline} onChange={(e) => updateField('isOffline', e.target.checked)} />
            In-person
          </label>
          <label className="radio-option">
            <input type="checkbox" checked={form.isOnline} onChange={(e) => updateField('isOnline', e.target.checked)} />
            Online
          </label>
        </div>

        <div className="radio-row">
          <span className="admin-form-label">Pricing</span>
          <label className="radio-option">
            <input type="radio" name="pricing" checked={form.pricing === 'free'} onChange={() => updateField('pricing', 'free')} />
            Free
          </label>
          <label className="radio-option">
            <input type="radio" name="pricing" checked={form.pricing === 'paid'} onChange={() => updateField('pricing', 'paid')} />
            Paid
          </label>
        </div>

        <label>
          Event link
          <input type="url" value={form.link} onChange={(e) => updateField('link', e.target.value)} placeholder="https://…" />
        </label>

        <label>
          Description
          <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={5} />
        </label>

        <label>
          Event image {existingImagePath && !imageFile && <span className="admin-form-hint">(current image will be kept unless you choose a new one)</span>}
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setImageFile(e.target.files[0] ?? null)} />
        </label>

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving…' : 'Save changes'}
        </button>
        {status === 'error' && <p className="admin-status error">{errorMessage}</p>}
      </form>
    </div>
  );
}
