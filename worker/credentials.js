// Per-request credentials. A token saved in the browser (sent as headers) takes priority over the Worker secret.
const TOKEN_PATTERN = /^[A-Za-z0-9._~+\/=-]{8,200}$/;

export function resolveCredentials(request, env) {
  const raw = request.headers.get('X-Tradier-Token');
  if (raw == null || raw.trim() === '') return { env, source: 'secret' };
  const token = raw.trim();
  if (!TOKEN_PATTERN.test(token)) {
    return { error: 'The saved token has an unexpected format. Paste it again in Settings.' };
  }
  const environment = request.headers.get('X-Tradier-Env') === 'production' ? 'production' : 'sandbox';
  return {
    env: {
      ...env,
      TRADIER_TOKEN: token,
      TRADIER_BASE_URL: environment === 'production' ? 'https://api.tradier.com' : 'https://sandbox.tradier.com',
    },
    source: 'browser',
    environment,
  };
}

// Cached results are keyed by a hash of the token, so one person's data is never served to another token.
export async function cacheKey(mode, creds) {
  if (creds.source === 'secret') return `${mode}|secret`;
  const bytes = new TextEncoder().encode(`${creds.env.TRADIER_BASE_URL}|${creds.env.TRADIER_TOKEN}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${mode}|${hex}`;
}
