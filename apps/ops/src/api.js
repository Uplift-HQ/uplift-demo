// Shared API helper for ops portal
const API_BASE = import.meta.env.VITE_API_URL || '';

// Track if we're already redirecting to prevent loops
let isRedirecting = false;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('ops_token');

  // Don't make authenticated API calls without a token
  if (!token && !path.includes('/auth/login')) {
    throw new Error('No authentication token');
  }

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  // Handle rate limiting
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After') || '60';
    throw new Error(`Rate limited. Please wait ${retryAfter} seconds.`);
  }

  if (res.status === 401) {
    localStorage.removeItem('ops_token');
    // Don't use window.location.href - let React handle navigation
    // This prevents infinite reload loops
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  return res.json();
}
