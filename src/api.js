const TOKEN_KEY = 'septeo-tirage-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(method, url, { body, adminCode } = {}) {
  const headers = { 'Content-Type': 'application/json' };
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
  },
};
