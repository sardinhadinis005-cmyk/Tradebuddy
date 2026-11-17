import { useState } from 'react';
import useAccount from '../features/useAccount.js';
import { saveTradierKey, removeTradierKey, testTradierKey, describeTiming } from '../api/account.js';
import { loadTradierSettings, clearTradierSettings, validateToken, maskToken } from '../api/tradierSettings.js';
import './account.css';

export default function ApiKeySettings() {
  const { status, account, error } = useAccount();
  const [tokenText, setTokenText] = useState('');
  const [environment, setEnvironment] = useState('sandbox');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ kind: 'idle', text: '' });
  const [legacy, setLegacy] = useState(loadTradierSettings);

  const configured = Boolean(account && account.tradier.configured);
  const ready = status === 'ready' && account.storage;

  const run = async (label, action) => {
    setBusy(true);
    setMessage({ kind: 'testing', text: label });
    try {
      setMessage(await action());
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = (event) => {
    event.preventDefault();
    const typed = tokenText.trim();
    const problem = validateToken(typed);
    if (problem) {
      setMessage({ kind: 'error', text: configured ? 'Paste the key again to save changes. Saved keys are never shown or sent back to the browser.' : problem });
      return;
    }
    run('Checking the key with Tradier…', async () => {
      const result = await saveTradierKey({ token: typed, environment });
      setTokenText('');
      setReveal(false);
      return { kind: 'ok', text: `Saved to your account (${environment}).${describeTiming(result.timing)}` };
    });
  };

  const handleTest = () => run('Testing the connection…', async () => {
    const r = await testTradierKey();
    const price = r.last != null ? ` ${r.symbol} last price ${r.last}.` : '';
    const when = r.tradeTime ? ` Last trade ${new Date(r.tradeTime).toLocaleString()}.` : '';
    return { kind: 'ok', text: `Connected to ${r.feed}.${price}${when}${describeTiming(r)}` };
  });

  const handleRemove = () => run('Removing the key…', async () => {
    await removeTradierKey();
    return { kind: 'idle', text: 'The key was removed from your account.' };
  });

  const handleMove = () => run('Moving the browser-saved key to your account…', async () => {
    const result = await saveTradierKey(legacy);
    clearTradierSettings();
    setLegacy(null);
    return { kind: 'ok', text: `Moved to your account and removed from this browser.${describeTiming(result.timing)}` };
  });

  return (
    <section className="dashboard-card api-settings" aria-labelledby="api-settings-title">
      <h3 id="api-settings-title">Your account and Tradier key</h3>
      {status === 'loading' && <p className="settings-note">Checking your account…</p>}
      {status === 'error' && <p className="settings-status is-error" role="alert">{error}</p>}
      {account && (
        <div className="account-row">
          <span>Signed in as <b>{account.email}</b></span>
          <a className="settings-button" href="/cdn-cgi/access/logout">Sign out</a>
        </div>
      )}
      {status === 'ready' && !account.storage && (
        <p className="settings-status is-error" role="alert">Account storage is not set up yet. Follow docs/ACCOUNT_SETUP.md, then reload.</p>
      )}
      <p className="settings-note">
        Your key is checked with Tradier, then encrypted before it is stored with your account. It is not shown again, not sent back to this page, and not visible to other accounts. Paste it again whenever you want to change it.
      </p>
      {ready && legacy && !configured && (
        <p className="settings-status">
          A key from the older browser-only setup was found ({maskToken(legacy.token)}, {legacy.environment}).{' '}
          <button type="button" className="settings-button" onClick={handleMove} disabled={busy}>Move it to my account</button>
        </p>
      )}
      <form className="settings-form" onSubmit={handleSave}>
        <fieldset className="settings-env" disabled={!ready}>
          <legend>Account type</legend>
          <label>
            <input type="radio" name="tradier-env" value="sandbox" checked={environment === 'sandbox'} onChange={() => setEnvironment('sandbox')} />
            Sandbox: about 15 minutes delayed
          </label>
          <label>
            <input type="radio" name="tradier-env" value="production" checked={environment === 'production'} onChange={() => setEnvironment('production')} />
            Production: an approved account; Tradebuddy checks whether the data is delayed
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
              disabled={!ready}
              value={tokenText}
              onChange={(event) => setTokenText(event.target.value)}
              placeholder={configured ? `A ${account.tradier.environment} key is saved. Paste a new one to replace it.` : 'Paste your token here'}
            />
            <button type="button" className="settings-button" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>
              {reveal ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="settings-actions">
          <button type="submit" className="settings-button is-primary" disabled={!ready || busy}>Save and test</button>
          {configured && <button type="button" className="settings-button" onClick={handleTest} disabled={busy}>Test again</button>}
          {configured && <button type="button" className="settings-button is-danger" onClick={handleRemove} disabled={busy}>Remove key</button>}
        </div>
      </form>
      {message.text && (
        <p className={`settings-status is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>
      )}
    </section>
  );
}
