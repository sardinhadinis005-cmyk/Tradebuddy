import { runScan } from './scan.js';
import { createTradier, TradierError } from './tradier.js';
import { marketSession } from './time.js';
import { resolveCredentials, cacheKey } from './credentials.js';
import { authenticate } from './access.js';
import { assessTiming, REFERENCE_SYMBOLS } from './timing.js';
import { saveTradier, removeTradier, tradierStatus, userId, VaultError } from './vault.js';
import { num } from './analysis.js';

const LIVE_TTL_MS = 60_000;
const REVIEW_TTL_MS = 300_000;
const TIMING_TTL_MS = 600_000;
const MAX_CACHE_ENTRIES = 50;
const MAX_BODY_CHARS = 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{8,200}$/;
const defaultCache = new Map();
const timingMemory = new Map();

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

const ROUTES = {
  '/api/account': ['GET'],
  '/api/session': ['GET'],
  '/api/test': ['GET'],
  '/api/candidates': ['GET'],
  '/api/settings/tradier': ['PUT', 'DELETE'],
};

async function cached(cache, key, ttlMs, nowMs, fn) {
  const hit = cache.get(key);
  if (hit && nowMs - hit.at < ttlMs) return hit.value;
  const value = await fn();
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { at: nowMs, value });
  return value;
}

function remember(id, nowMs, timing) {
  if (timingMemory.size >= MAX_CACHE_ENTRIES) timingMemory.delete(timingMemory.keys().next().value);
  timingMemory.set(id, { at: nowMs, timing });
}

function failure(err) {
  if (err instanceof VaultError) return json({ error: err.message }, 503);
  if (err instanceof TradierError) {
    if (err.status === 401 || err.status === 403) {
      return json({ error: 'Tradier rejected the saved key. Check the key, and that the account type (sandbox or production) matches it.' }, 502);
    }
    if (err.status === 429) return json({ error: 'The data provider rate limit was reached. Wait a minute and refresh.' }, 429);
    return json({ error: `The data provider returned an error (${err.status}).` }, 502);
  }
  return json({ error: 'The request failed unexpectedly.' }, 500);
}

async function readJsonBody(request) {
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) return { error: 'Send JSON.' };
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return { error: 'The request is too large.' };
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? { value } : { error: 'Send a JSON object.' };
  } catch {
    return { error: 'The request was not valid JSON.' };
  }
}

export async function handleApi(request, env, deps = {}) {
  const url = new URL(request.url);
  const now = deps.now ?? new Date();
  const cache = deps.cache ?? defaultCache;

  const allowed = ROUTES[url.pathname];
  if (!allowed) return json({ error: 'Not found' }, 404);
  if (!allowed.includes(request.method)) return json({ error: 'Method not allowed' }, 405, { Allow: allowed.join(', ') });

  const auth = await (deps.authenticate ?? authenticate)(request, env, { fetchImpl: deps.fetchImpl, nowMs: now.getTime() });
  if (auth.error) return json({ error: auth.error }, auth.status);
  const { email } = auth;

  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      return json({ error: 'Cross-site requests are not allowed.' }, 403);
    }
  }

  try {
    const id = await userId(email);

    if (url.pathname === '/api/account') {
      const storage = Boolean(env.SETTINGS) && Boolean(env.SETTINGS_SECRET);
      let tradier = { configured: false, environment: null, last4: null };
      if (storage) {
        const status = await tradierStatus(env, email);
        tradier = { ...status, last4: null };
      }
      return json({ email, storage, tradier });
    }

    if (url.pathname === '/api/settings/tradier') {
      if (!env.SETTINGS || !env.SETTINGS_SECRET) return json({ error: 'Account storage is not set up yet.' }, 503);
      if (request.method === 'DELETE') {
        await removeTradier(env, email);
        timingMemory.delete(id);
        return json({ ok: true });
      }
      const body = await readJsonBody(request);
      if (body.error) return json({ error: body.error }, 400);
      const token = String(body.value.token ?? '').trim();
      const environment = body.value.environment === 'production' ? 'production' : body.value.environment === 'sandbox' ? 'sandbox' : null;
      if (!environment) return json({ error: 'Choose sandbox or production.' }, 400);
      if (!TOKEN_PATTERN.test(token)) return json({ error: 'That does not look like a Tradier token. It should be one unbroken string with no spaces.' }, 400);
      const testEnv = { ...env, TRADIER_TOKEN: token, TRADIER_BASE_URL: environment === 'production' ? 'https://api.tradier.com' : 'https://sandbox.tradier.com' };
      let quotes;
      try {
        ({ quotes } = await createTradier(testEnv, deps.fetchImpl).quotes(REFERENCE_SYMBOLS));
      } catch (error) {
        if (error instanceof TradierError && (error.status === 401 || error.status === 403)) {
          return json({ error: `Tradier rejected this key for the ${environment} environment. Nothing was saved.` }, 400);
        }
        throw error;
      }
      const timing = assessTiming({ sandbox: environment === 'sandbox', quotes, now });
      await saveTradier(env, email, { token, environment });
      remember(id, now.getTime(), timing);
      return json({ ok: true, tradier: { configured: true, environment, last4: token.slice(-4) }, timing });
    }

    const creds = await resolveCredentials(env, email);
    if (creds.error) return json({ error: creds.error }, creds.status);
    const active = creds.env;
    const sandbox = !active.TRADIER_BASE_URL || active.TRADIER_BASE_URL.includes('sandbox');

    if (url.pathname === '/api/session') {
      const configured = Boolean(active.TRADIER_TOKEN);
      const memo = timingMemory.get(id);
      const timing = sandbox ? 'delayed' : memo && now.getTime() - memo.at < TIMING_TTL_MS ? memo.timing.timing : 'unverified';
      const feed = !configured ? 'none' : sandbox ? 'Tradier sandbox (15 min delayed)' : timing === 'delayed' ? 'Tradier (delayed)' : timing === 'realtime' ? 'Tradier (real-time)' : 'Tradier';
      return json({ session: marketSession(now), feed, connected: configured, timing: configured ? timing : null, timestamp: now.toISOString() });
    }

    if (url.pathname === '/api/test') {
      if (!active.TRADIER_TOKEN) return json({ ok: false, error: 'No key is saved for your account. Add your Tradier key in Settings.' }, 400);
      const { quotes } = await createTradier(active, deps.fetchImpl).quotes(REFERENCE_SYMBOLS);
      const q = quotes.find((x) => String(x?.symbol).toUpperCase() === 'SPY') ?? quotes[0];
      if (!q) return json({ ok: false, error: 'The key was accepted, but no quote came back.' }, 502);
      const timing = assessTiming({ sandbox, quotes, now });
      remember(id, now.getTime(), timing);
      const tradeMs = num(q.trade_date);
      return json({
        ok: true,
        feed: sandbox ? 'Tradier sandbox' : 'Tradier',
        timing: timing.timing,
        delayMinutes: timing.delayMinutes,
        timingBasis: timing.basis,
        source: creds.source,
        symbol: q.symbol,
        last: num(q.last),
        tradeTime: tradeMs ? new Date(tradeMs).toISOString() : null,
      });
    }

    const mode = url.searchParams.get('mode') ?? 'live';
    if (!['live', 'review'].includes(mode)) return json({ error: 'mode must be live or review' }, 400);
    const key = `${id}|${await cacheKey(mode, creds)}`;
    const result = await cached(cache, key, mode === 'live' ? LIVE_TTL_MS : REVIEW_TTL_MS, now.getTime(), () =>
      runScan({ env: active, mode, fetchImpl: deps.fetchImpl, now }),
    );
    if (result.meta?.timing) remember(id, now.getTime(), { timing: result.meta.timing });
    return json(result);
  } catch (err) {
    return failure(err);
  }
}
