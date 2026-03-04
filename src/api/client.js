const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Request to Rails API. In dev with Vite proxy, use paths like '/api/...'.
 * @param {string} path - Path (e.g. '/api/drones')
 * @param {RequestInit} [options] - fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>}
 */
export function apiRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = typeof window !== 'undefined' && window.localStorage.getItem('api_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}

/**
 * GET and parse JSON.
 * @param {string} path
 * @returns {Promise<unknown>}
 */
export async function apiGet(path) {
  const res = await apiRequest(path);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * POST with JSON body and parse JSON response.
 * @param {string} path
 * @param {object} body
 * @returns {Promise<unknown>}
 */
export async function apiPost(path, body) {
  const res = await apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * PATCH with JSON body and parse JSON response.
 * @param {string} path
 * @param {object} body
 * @returns {Promise<unknown>}
 */
export async function apiPatch(path, body) {
  const res = await apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * DELETE request.
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function apiDelete(path) {
  const res = await apiRequest(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
}
