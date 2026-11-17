import { authenticate as browserAuth } from './access.js';
import { userId } from './vault.js';

const TTL = 30 * 86400;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const digest = async value => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
};

export async function authenticate(request, env) {
  const header = request.headers.get('Authorization');
  if (header === null) return browserAuth(request, env);
  if (new URL(request.url).pathname !== '/mcp') return { error: 'Unauthorized', status: 401 };
  if (!env.SETTINGS) return { error: 'Account storage is not set up.', status: 503 };
  const match = /^Bearer (tbm_[a-f0-9]{64})$/.exec(header);
  if (!match) return { error: 'Invalid connector token', status: 401 };
  try {
    const raw = await env.SETTINGS.get(`mcp-token:${await digest(match[1])}`);
    const record = raw ? JSON.parse(raw) : null;
    if (!record || record.scope !== 'mcp:drafts' || typeof record.email !== 'string' || !Number.isFinite(record.expiresAt) || record.expiresAt <= Date.now()) return { error: 'Expired or revoked connector token', status: 401 };
    return { email: record.email, scope: record.scope };
  } catch { return { error: 'Connector authentication unavailable', status: 503 }; }
}

export async function manageMcpToken(request, env) {
  // Connector tokens can never create or revoke credentials, even with a browser session attached.
  if (request.headers.has('Authorization')) return json({ error: 'Browser sign-in required' }, 403);
  const auth = await browserAuth(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (!env.SETTINGS) return json({ error: 'Account storage is not set up.' }, 503);
  if (!['POST', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Same-origin browser request required' }, 403);
  try {
    const ownerKey = `mcp-owner:${await userId(auth.email)}`;
    const previous = await env.SETTINGS.get(ownerKey);
    if (previous) await env.SETTINGS.delete(`mcp-token:${previous}`);
    await env.SETTINGS.delete(ownerKey);
    if (request.method === 'DELETE') return json({ ok: true });
    const token = 'tbm_' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = await digest(token);
    const expiresAt = Date.now() + TTL * 1000;
    await env.SETTINGS.put(ownerKey, hash, { expirationTtl: TTL });
    await env.SETTINGS.put(`mcp-token:${hash}`, JSON.stringify({ email: auth.email, scope: 'mcp:drafts', expiresAt }), { expirationTtl: TTL });
    return json({ token, expiresAt: new Date(expiresAt).toISOString(), scope: 'mcp:drafts' });
  } catch { return json({ error: 'Could not update connector credential' }, 503); }
}
