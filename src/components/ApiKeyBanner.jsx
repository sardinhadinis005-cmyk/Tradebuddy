import './account.css';

export default function ApiKeyBanner({ state, onOpenSettings }) {
  if (state.status === 'loading') return null;
  if (state.status === 'error') {
    return <div className="account-banner is-error" role="alert"><p>Could not check your account: {state.error}</p></div>;
  }
  const account = state.account;
  if (!account.storage) {
    return (
      <div className="account-banner is-error" role="alert">
        <p>Account storage is not set up yet, so a market data key cannot be saved. See docs/ACCOUNT_SETUP.md.</p>
      </div>
    );
  }
  if (account.tradier.configured) return null;
  return (
    <div className="account-banner" role="status">
      <p><strong>No market data API key.</strong> Live and Last session need a Tradier key. Demo data still works.</p>
      <button type="button" className="settings-button is-primary" onClick={onOpenSettings}>Add it in Settings</button>
    </div>
  );
}
