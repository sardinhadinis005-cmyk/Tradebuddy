async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Could not reach Tradebuddy. If your sign-in expired, reload the page to sign in again.');
  }
  let body = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (!res.ok) throw new Error((body && body.error) || `The request failed (${res.status}).`);
  if (!body) throw new Error('Unexpected response. Reload the page to sign in again.');
  return body;
}

export const fetchAccount = (signal) => request('/api/account', { signal });
export const testTradierKey = () => request('/api/test');

export async function saveTradierKey({ token, environment }) {
  const body = await request('/api/settings/tradier', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: String(token).trim(), environment }),
  });
  window.dispatchEvent(new Event('tradebuddy-settings-changed'));
  return body;
}

export async function removeTradierKey() {
  const body = await request('/api/settings/tradier', { method: 'DELETE' });
  window.dispatchEvent(new Event('tradebuddy-settings-changed'));
  return body;
}

export function describeTiming(result) {
  if (!result) return '';
  if (result.timing === 'delayed') return ` Data is delayed about ${result.delayMinutes ?? 15} minutes.`;
  if (result.timing === 'realtime') return ' Data looks real-time.';
  return ` ${result.timingBasis || result.basis || 'Whether the data is delayed could not be verified right now.'}`;
}
