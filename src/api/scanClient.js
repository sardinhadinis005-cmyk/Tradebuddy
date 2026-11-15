import { tradierHeaders } from './tradierSettings.js';

export async function fetchScan(mode, { signal } = {}) {
  const res = await fetch(`/api/candidates?mode=${encodeURIComponent(mode)}`, {
    signal,
    headers: { Accept: 'application/json', ...tradierHeaders() },
  });
  let body = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
  if (!body || !Array.isArray(body.candidates) || typeof body.meta !== 'object' || body.meta === null) {
    throw new Error('Unexpected response from the server');
  }
  return body;
}
