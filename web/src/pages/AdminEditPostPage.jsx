import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import TagPicker from '../components/TagPicker.jsx';

function dayKeyFromPubDate(pubDate) {
  return new Date(pubDate).toISOString().slice(0, 10);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminEditPostPage() {
  const { id } = useParams();
  const { authFetch } = useAdminAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [knownTags, setKnownTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [existingImagePath, setExistingImagePath] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [origin, setOrigin] = useState('manual');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function load() {
      const [index, registeredTags] = await Promise.all([
        fetch('/data/index.json').then((r) => r.json()),
        fetch('/data/tags.json').then((r) => r.json()).catch(() => []),
      ]);

      const entry = index.find((a) => a.id === id);
      if (!entry) throw new Error('Post not found.');

      const day = dayKeyFromPubDate(entry.pubDate);
      const dayArticles = await fetch(`/data/articles/${day}.json`).then((r) => r.json());
      const full = dayArticles.find((a) => a.id === id);
      if (!full) throw new Error('Post not found in archive.');

      const usedTags = index.flatMap((item) => item.tags ?? []);
      const merged = [...new Set([...registeredTags, ...usedTags, ...(full.tags ?? [])])].sort((a, b) => a.localeCompare(b));

      setTitle(full.title);
      setContent(full.content);
      setSelectedTags(full.tags ?? []);
      setKnownTags(merged);
      setExistingImagePath(full.imagePath ?? null);
      setOrigin(entry.origin ?? 'manual');
    }

    load()
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const image = imageFile ? await fileToDataUrl(imageFile) : null;

      const res = await authFetch('/api/update-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, content, tags: selectedTags, image }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);

      navigate(origin === 'manual' ? '/admin/posts' : '/admin/ai-posts');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  }

  if (loading) return <p className="status-message">Loading…</p>;
  if (loadError) return <p className="status-message error">{loadError}</p>;

  return (
    <div className="admin-page">
      <h1>Edit Post</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          Title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label>
          Post content
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} required />
        </label>

        <div>
          <span className="admin-form-label">Select tags</span>
          <TagPicker knownTags={knownTags} selectedTags={selectedTags} onChange={setSelectedTags} />
        </div>

        <label>
          Post image {existingImagePath && !imageFile && <span className="admin-form-hint">(current image will be kept unless you choose a new one)</span>}
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
