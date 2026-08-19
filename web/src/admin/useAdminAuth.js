import { useCallback, useState } from 'react';

const TOKEN_KEY = 'admin_token';

export function useAdminAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `Login failed: ${res.status}`);

    sessionStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) logout();
      return res;
    },
    [token, logout]
  );

  return { token, isAuthenticated: Boolean(token), login, logout, authFetch };
}
