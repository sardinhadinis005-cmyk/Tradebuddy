// Older versions kept the token in this browser. Keys now live encrypted in the signed-in account;
// these helpers remain only so an old browser-saved key can be moved over and then removed.
const KEY = 'tradebuddy-tradier';
export const SETTINGS_EVENT = 'tradebuddy-settings-changed';
const TOKEN_PATTERN = /^[A-Za-z0-9._~+\/=-]{8,200}$/;

export function validateToken(text) {
  const t = String(text ?? '').trim();
  if (t === '') return 'Enter your Tradier access token.';
  if (!TOKEN_PATTERN.test(t)) {
    return 'That does not look like a Tradier token. It should be one unbroken string of letters and numbers, with no spaces.';
  }
  return null;
}

export const maskToken = (token) => `••••${String(token).slice(-4)}`;

export function loadTradierSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw.token === 'string' && raw.token) {
      return { token: raw.token, environment: raw.environment === 'production' ? 'production' : 'sandbox' };
    }
  } catch { /* unreadable or blocked storage counts as no saved key */ }
  return null;
}

export function clearTradierSettings() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

// Tokens are no longer sent from the browser with each request.
export const tradierHeaders = () => ({});
