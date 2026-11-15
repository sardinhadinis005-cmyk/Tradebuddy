import { runScan } from './scan.js';
import { TradierError } from './tradier.js';
import { marketSession } from './time.js';

const LIVE_TTL_MS = 60_000;
const REVIEW_TTL_MS = 300_000;
const defaultCache = new Map();

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function cached(cache, key, ttlMs, nowMs, fn) {
  const hit = cache.get(key);
  if (hit && nowMs - hit.at < ttlMs) return hit.value;
  const value = await fn();
  cache.set(key, { at: nowMs, value });
  return value;
}

export async function handleApi(request, env, deps = {}) {
  const url = new URL(request.url);
  const now = deps.now ?? new Date();
  const cache = deps.cache ?? defaultCache;

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  if (url.pathname === '/api/session') {
    const configured = Boolean(env.TRADIER_TOKEN);
    const sandbox = !env.TRADIER_BASE_URL || env.TRADIER_BASE_URL.includes('sandbox');
    return json({
      session: marketSession(now),
      feed: configured ? (sandbox ? 'Tradier sandbox (15 min delayed)' : 'Tradier') : 'none',
      connected: configured,
      timestamp: now.toISOString(),
    });
  }

  if (url.pathname === '/api/candidates') {
    const mode = url.searchParams.get('mode') ?? 'live';
    if (!['live', 'review'].includes(mode)) return json({ error: 'mode must be live or review' }, 400);
    try {
      const result = await cached(cache, mode, mode === 'live' ? LIVE_TTL_MS : REVIEW_TTL_MS, now.getTime(), () =>
        runScan({ env, mode, fetchImpl: deps.fetchImpl, now }),
      );
      return json(result);
    } catch (err) {
      if (err instanceof TradierError) {
        if (err.status === 401 || err.status === 403) {
          return json({ error: 'The data provider rejected the token. Check TRADIER_TOKEN and TRADIER_BASE_URL (sandbox and production use different tokens).' }, 502);
        }
        if (err.status === 429) return json({ error: 'The data provider rate limit was reached. Wait a minute and refresh.' }, 429);
        return json({ error: `The data provider returned an error (${err.status}).` }, 502);
      }
      return json({ error: 'The scan failed unexpectedly.' }, 500);
    }
  }

  return json({ error: 'Not found' }, 404);
}
