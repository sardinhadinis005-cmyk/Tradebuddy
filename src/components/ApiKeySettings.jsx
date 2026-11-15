import { useState } from 'react';
import {
  loadTradierSettings,
  saveTradierSettings,
  clearTradierSettings,
  tradierHeaders,
  validateToken,
  maskToken,
} from '../api/tradierSettings.js';

async function testConnection() {
  const res = await fetch('/api/test', { headers: { Accept: 'application/json', ...tradierHeaders() } });
  let body = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (!res.ok || !body || body.ok !== true) throw new Error((body && body.error) || `The test failed (${res.status})`);
  return body;
}

export default function ApiKeySettings() {
  const [saved, setSaved] = useState(loadTradierSettings);
  const [tokenText, setTokenText] = useState('');
  const [environment, setEnvironment] = useState(() => (loadTradierSettings() || {}).environment || 'sandbox');
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState({ kind: 'idle', message: '' });

  const runTest = async () => {
    setStatus({ kind: 'testing', message: 'Testing the connection…' });
    try {
      const r = await testConnection();
      const price = r.last != null ? ` ${r.symbol} last price ${r.last}.` : '';
      const when = r.tradeTime ? ` Last trade ${new Date(r.tradeTime).toLocaleString()}.` : '';
      const delay = r.delayMinutes ? ` Data is delayed about ${r.delayMinutes} minutes.` : '';
      setStatus({ kind: 'ok', message: `Connected to ${r.feed}.${price}${when}${delay}` });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const typed = tokenText.trim();
    const keepExisting = typed === '' && saved;
    if (!keepExisting) {
      const problem = validateToken(typed);
      if (problem) {
        setStatus({ kind: 'error', message: problem });
        return;
      }
    }
    try {
      const next = saveTradierSettings({ token: keepExisting ? saved.token : typed, environment });
      setSaved(next);
    } catch (error) {
      setStatus({ kind: 'error', message: error.message });
      return;
    }
    setTokenText('');
    setReveal(false);
    await runTest();
  };

  const handleRemove = () => {
    clearTradierSettings();
    setSaved(null);
    setTokenText('');
    setStatus({ kind: 'idle', message: 'The token was removed from this browser.' });
  };

  return (
    <section className="dashboard-card api-settings" aria-labelledby="api-settings-title">
      <h3 id="api-settings-title">Market data: Tradier</h3>
      <p className="settings-note">
        Paste your Tradier access token. It is kept only in this browser and sent to your Tradebuddy Worker with each data request. The server does not store it. Anyone who can use this browser profile can read it, so remove it on a shared computer. A sandbox token is the safer choice.
      </p>
      <form className="settings-form" onSubmit={handleSave}>
        <fieldset className="settings-env">
          <legend>Account type</legend>
          <label>
            <input type="radio" name="tradier-env" value="sandbox" checked={environment === 'sandbox'} onChange={() => setEnvironment('sandbox')} />
            Sandbox: about 15 minutes delayed
          </label>
          <label>
            <input type="radio" name="tradier-env" value="production" checked={environment === 'production'} onChange={() => setEnvironment('production')} />
            Production: needs an approved, funded account
          </label>
        </fieldset>
        <div className="settings-field">
          <label htmlFor="tradier-token">Access token</label>
          <div className="settings-token-row">
            <input
              id="tradier-token"
              type={reveal ? 'text' : 'password'}
              autoComplete="new-password"
              spellCheck={false}
              value={tokenText}
              onChange={(event) => setTokenText(event.target.value)}
              placeholder={saved ? `Saved: ${maskToken(saved.token)} (${saved.environment})` : 'Paste your token here'}
            />
            <button type="button" className="settings-button" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>
              {reveal ? 'Hide' : 'Show'}
            </button>
          </div>
          {saved && <span className="settings-hint">Leave this empty to keep the saved token and only change the account type.</span>}
        </div>
        <div className="settings-actions">
          <button type="submit" className="settings-button is-primary" disabled={status.kind === 'testing'}>Save and test</button>
          {saved && <button type="button" className="settings-button" onClick={runTest} disabled={status.kind === 'testing'}>Test again</button>}
          {saved && <button type="button" className="settings-button is-danger" onClick={handleRemove}>Remove token</button>}
        </div>
      </form>
      {status.message && (
        <p className={`settings-status is-${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.message}</p>
      )}
    </section>
  );
}
