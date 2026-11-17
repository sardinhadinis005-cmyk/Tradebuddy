// Per-request credentials come only from the signed-in user's encrypted record. Tokens are never read from request headers.
import { loadTradier } from './vault.js';

export async function resolveCredentials(env, email) {
  if (!env.SETTINGS) return { error: 'Account storage is not set up yet. Add the SETTINGS KV binding and SETTINGS_SECRET to the Worker.', status: 503 };
  const stored = await loadTradier(env, email);
  if (stored) {
    return {
      env: { ...env, TRADIER_TOKEN: stored.token, TRADIER_BASE_URL: stored.environment === 'production' ? 'https://api.tradier.com' : 'https://sandbox.tradier.com' },
      source: 'account',
      environment: stored.environment,
    };
  }
  if (env.ALLOW_SHARED_TOKEN === 'true' && env.TRADIER_TOKEN) return { env, source: 'shared', environment: String(env.TRADIER_BASE_URL ?? '').includes('sandbox') ? 'sandbox' : 'production' };
  return { env: { ...env, TRADIER_TOKEN: '' }, source: 'none', environment: null };
}

// Cached results are keyed by a hash of the token, so one person's data is never served to another token.
export async function cacheKey(mode, creds) {
  if (creds.source === 'none') return `${mode}|none`;
  const bytes = new TextEncoder().encode(`${creds.env.TRADIER_BASE_URL}|${creds.env.TRADIER_TOKEN}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${mode}|${hex}`;
}
