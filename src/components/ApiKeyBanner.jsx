import './account.css';

export default function ApiKeyBanner({ state, onOpenSettings }) {
  if (state.status === 'loading') return null;
  const settings = <button type="button" className="settings-button is-primary" onClick={onOpenSettings}>Open Settings</button>;
  if (state.status === 'error' || !state.account) {
    return <div className="account-banner is-error" role="alert"><p>Could not verify your saved market data key. {state.error} This does not mean your saved key was deleted.</p>{settings}</div>;
  }
  const account = state.account;
  if (!account.storage) {
    return <div className="account-banner is-error" role="alert"><p>Secure account storage is unavailable. Your saved key may still exist, but cannot currently be accessed. Restore the SETTINGS binding and SETTINGS_SECRET before replacing your key.</p>{settings}</div>;
  }
  if (account.tradier?.configured) return null;
  return <div className="account-banner" role="status"><p><strong>No market data API key saved for this signed-in account.</strong> Live and Last session need a Tradier key. Save it in Settings; it is encrypted in persistent account storage. Demo data still works.</p>{settings}</div>;
}
