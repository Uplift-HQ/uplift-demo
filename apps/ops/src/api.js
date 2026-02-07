// Shared API helper for ops portal
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('ops_token');
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('ops_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  return res.json();
}
