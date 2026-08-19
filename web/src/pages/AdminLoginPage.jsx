import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../admin/useAdminAuth.js';

export default function AdminLoginPage() {
  const { isAuthenticated, login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | error
  const [errorMessage, setErrorMessage] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');
    try {
      await login(username, password);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  }

  return (
    <div className="admin-login-page">
      <h1>Admin Login</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <label>
          Username
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Logging in…' : 'Log in'}
        </button>
        {status === 'error' && <p className="admin-status error">{errorMessage}</p>}
      </form>
    </div>
  );
}
