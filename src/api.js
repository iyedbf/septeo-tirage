export const GROUP = new URLSearchParams(window.location.search).get('groupe')?.trim().toLowerCase() || 'general';
export const IS_TEAM = GROUP !== 'general';

const TOKEN_KEY = IS_TEAM ? `septeo-tirage-token:${GROUP}` : 'septeo-tirage-token';
export const ADMIN_KEY = `septeo-tirage-admin:${GROUP}`;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const groupLink = (slug) => `${window.location.origin}/?groupe=${encodeURIComponent(slug)}`;

async function request(method, url, { body, adminCode } = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-group': GROUP };
  const token = getToken();
  if (token) headers['x-token'] = token;
  if (adminCode) headers['x-admin-code'] = adminCode;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Une erreur est survenue.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  state: () => request('GET', '/api/state'),
  me: () => request('GET', '/api/me'),
  register: (body) => request('POST', '/api/register', { body }),
  login: (body) => request('POST', '/api/login', { body }),
  draw: () => request('POST', '/api/draw'),
  admin: {
    verify: (code) => request('POST', '/api/admin/verify', { adminCode: code }),
    participants: (code) => request('GET', '/api/admin/participants', { adminCode: code }),
    close: (code) => request('POST', '/api/admin/close', { adminCode: code }),
    reopen: (code) => request('POST', '/api/admin/reopen', { adminCode: code }),
    reset: (code) => request('POST', '/api/admin/reset', { adminCode: code }),
    remove: (code, id) => request('DELETE', `/api/admin/participants/${id}`, { adminCode: code }),
    groups: (code) => request('GET', '/api/admin/groups', { adminCode: code }),
    createGroup: (code, body) => request('POST', '/api/admin/groups', { adminCode: code, body }),
    deleteGroup: (code, slug) => request('DELETE', `/api/admin/groups/${encodeURIComponent(slug)}`, { adminCode: code }),
  },
};
