import { runScan } from './scan.js';
import { createTradier, TradierError } from './tradier.js';
import { marketSession } from './time.js';
import { resolveCredentials, cacheKey } from './credentials.js';
import { num } from './analysis.js';

const LIVE_TTL_MS = 60_000;
const REVIEW_TTL_MS = 300_000;
const MAX_CACHE_ENTRIES = 50;
const defaultCache = new Map();

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isSandbox = (env) => !env.TRADIER_BASE_URL || env.TRADIER_BASE_URL.includes('sandbox');

async function cached(cache, key, ttlMs, nowMs, fn) {
  const hit = cache.get(key);
  if (hit && nowMs - hit.at < ttlMs) return hit.value;
  const value = await fn();
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { at: nowMs, value });
  return value;
}

function failure(err) {
  if (err instanceof TradierError) {
    if (err.status === 401 || err.status === 403) {
      return json({ error: 'The data provider rejected the token. Check the token, and that the account type (sandbox or production) matches it.' }, 502);
    }
    if (err.status === 429) return json({ error: 'The data provider rate limit was reached. Wait a minute and refresh.' }, 429);
    return json({ error: `The data provider returned an error (${err.status}).` }, 502);
  }
  return json({ error: 'The request failed unexpectedly.' }, 500);
}

export async function handleApi(request, env, deps = {}) {
  const url = new URL(request.url);
  const now = deps.now ?? new Date();
  const cache = deps.cache ?? defaultCache;

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const known = ['/api/session', '/api/candidates', '/api/test'];
  if (!known.includes(url.pathname)) return json({ error: 'Not found' }, 404);

  const creds = resolveCredentials(request, env);
  if (creds.error) return json({ error: creds.error }, 400);
  const active = creds.env;

  if (url.pathname === '/api/session') {
    const configured = Boolean(active.TRADIER_TOKEN);
    return json({
      session: marketSession(now),
      feed: configured ? (isSandbox(active) ? 'Tradier sandbox (15 min delayed)' : 'Tradier') : 'none',
      connected: configured,
      timestamp: now.toISOString(),
    });
  }

  if (url.pathname === '/api/test') {
    if (!active.TRADIER_TOKEN) return json({ ok: false, error: 'No token is configured. Save your Tradier token in Settings.' }, 400);
    try {
      const { quotes } = await createTradier(active, deps.fetchImpl).quotes(['SPY']);
      const q = quotes[0];
      if (!q) return json({ ok: false, error: 'The token was accepted, but no quote came back for SPY.' }, 502);
      const tradeMs = num(q.trade_date);
      return json({
        ok: true,
        feed: isSandbox(active) ? 'Tradier sandbox' : 'Tradier',
        delayMinutes: isSandbox(active) ? 15 : null,
        source: creds.source,
        symbol: 'SPY',
        last: num(q.last),
        tradeTime: tradeMs ? new Date(tradeMs).toISOString() : null,
      });
    } catch (err) {
      return failure(err);
    }
  }

  const mode = url.searchParams.get('mode') ?? 'live';
  if (!['live', 'review'].includes(mode)) return json({ error: 'mode must be live or review' }, 400);
  try {
    const key = await cacheKey(mode, creds);
    const result = await cached(cache, key, mode === 'live' ? LIVE_TTL_MS : REVIEW_TTL_MS, now.getTime(), () =>
      runScan({ env: active, mode, fetchImpl: deps.fetchImpl, now }),
    );
    return json(result);
  } catch (err) {
    return failure(err);
  }
}
