// Verifies the signed token Cloudflare Access adds to every request, so a direct call cannot pretend to be signed in.
const TEAM_PATTERN = /^https:\/\/[a-z0-9][a-z0-9-]*\.cloudflareaccess\.com$/;
const KEY_TTL_MS = 3_600_000;
const REFETCH_GAP_MS = 60_000;
const LEEWAY_SECONDS = 60;
const keyCache = new Map();

const fail = (status, error) => ({ status, error });

function decodePart(part) {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
const decodeJson = (part) => JSON.parse(new TextDecoder().decode(decodePart(part)));

async function loadKeys(team, fetchImpl, nowMs, force) {
  const hit = keyCache.get(team);
  if (hit && !force && nowMs - hit.at < KEY_TTL_MS) return hit.keys;
  if (hit && force && nowMs - hit.fetchedAt < REFETCH_GAP_MS) return hit.keys;
  const res = await fetchImpl(`${team}/cdn-cgi/access/certs`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('keys');
  const body = await res.json();
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  keyCache.set(team, { at: nowMs, fetchedAt: nowMs, keys });
  return keys;
}

export const clearAccessKeyCache = () => keyCache.clear();

export async function authenticate(request, env, { fetchImpl = (...a) => fetch(...a), nowMs = Date.now() } = {}) {
  const team = String(env.TEAM_DOMAIN ?? '').replace(/\/+$/, '');
  if (!TEAM_PATTERN.test(team) || !env.POLICY_AUD) {
    return fail(503, 'Sign-in protection is not set up yet. Add TEAM_DOMAIN and POLICY_AUD to the Worker, then reload.');
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return fail(401, 'Sign in required. Reload the page to sign in.');
  const parts = token.split('.');
  if (parts.length !== 3) return fail(401, 'Sign in required. Reload the page to sign in.');
  try {
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('header');
    let keys = await loadKeys(team, fetchImpl, nowMs, false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      keys = await loadKeys(team, fetchImpl, nowMs, true);
      jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) throw new Error('kid');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodePart(parts[2]), signed);
    if (!valid) throw new Error('signature');
    const nowSec = Math.floor(nowMs / 1000);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (payload.iss !== team || !audiences.includes(env.POLICY_AUD)) throw new Error('claims');
    if (typeof payload.exp !== 'number' || payload.exp < nowSec - LEEWAY_SECONDS) throw new Error('expired');
    if (typeof payload.nbf === 'number' && payload.nbf > nowSec + LEEWAY_SECONDS) throw new Error('early');
    const email = String(payload.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}$/.test(email)) throw new Error('email');
    return { email };
  } catch {
    return fail(401, 'Your sign-in could not be verified. Reload the page to sign in again.');
  }
}
