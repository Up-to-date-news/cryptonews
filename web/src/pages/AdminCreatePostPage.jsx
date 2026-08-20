import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';
import TagPicker from '../components/TagPicker.jsx';

export default function AdminCreatePostPage() {
  const { authFetch } = useAdminAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [knownTags, setKnownTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/data/tags.json').then((r) => r.json()).catch(() => []),
      fetch('/data/index.json').then((r) => r.json()).catch(() => []),
    ]).then(([registeredTags, index]) => {
      const usedTags = index.flatMap((item) => item.tags ?? []);
      const merged = [...new Set([...registeredTags, ...usedTags])].sort((a, b) => a.localeCompare(b));
      setKnownTags(merged);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await authFetch('/api/create-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags: selectedTags }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Request failed: ${res.status}`);

      navigate('/admin/posts');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  }

  return (
    <div className="admin-page">
      <h1>Create Post</h1>
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

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Publishing…' : 'Post'}
        </button>
        {status === 'error' && <p className="admin-status error">{errorMessage}</p>}
      </form>
    </div>
  );
}
