import { useEffect, useRef, useState } from 'react';
import { generateMcpToken, revokeMcpToken, testMcpToken } from '../api/mcpSettings.js';

export default function McpSettings({ enabled }) {
  const endpoint = new URL('/mcp', window.location.origin).href;
  const [token, setToken] = useState('');
  const [expiry, setExpiry] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const run = async action => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setFailed(false); setMessage('Working…');
    try { await action(); }
    catch (error) { if (mounted.current) { setFailed(true); setMessage(error.message); } }
    finally { lock.current = false; if (mounted.current) { setBusy(false); setConfirm(null); } }
  };
  const copy = async (value, label) => {
    try { await navigator.clipboard.writeText(value); if (mounted.current) { setFailed(false); setMessage(`${label} copied. Keep credentials private.`); } }
    catch { if (mounted.current) { setFailed(true); setMessage('Clipboard unavailable. Select the field and copy manually.'); } }
  };
  const generate = () => run(async () => {
    const result = await generateMcpToken();
    if (!mounted.current) return;
    setToken(result.token); setExpiry(result.expiresAt); setVisible(false);
    setMessage('Token created. Copy it now; it cannot be retrieved after leaving Settings. Existing token rotation may take time to propagate.');
  });
  const revoke = () => run(async () => {
    await revokeMcpToken();
    if (!mounted.current) return;
    setToken(''); setExpiry(''); setVisible(false);
    setMessage('Revocation requested. KV propagation can delay invalidation.');
  });
  const test = () => run(async () => {
    const names = await testMcpToken(token.trim());
    if (mounted.current) setMessage(`Browser-to-Worker test passed: ${names.length} tools found. Perplexity network access is still unverified.`);
  });

  return (
    <div className="settings-form" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <h3 id="mcp-settings-title">AI connection · MCP</h3>
      <p className="settings-note">Connect Perplexity to your private research drafts. No broker access or order tools. Paid API automation is not enabled.</p>
      <div className="settings-field">
        <label htmlFor="mcp-endpoint">MCP endpoint</label>
        <div className="settings-token-row">
          <input id="mcp-endpoint" value={endpoint} readOnly onFocus={e => e.target.select()} />
          <button className="settings-button" type="button" onClick={() => copy(endpoint, 'Endpoint')}>Copy</button>
        </div>
      </div>
      <p className="settings-note">Token status is not fetched on page load. A previously generated token may still exist. Generate/Rotate replaces it. Tokens expire after 30 days.</p>
      <div className="settings-field">
        <label htmlFor="mcp-token">Connector token</label>
        <input id="mcp-token" type={visible ? 'text' : 'password'} value={token} autoComplete="off" autoCapitalize="none" spellCheck={false}
          disabled={!enabled || busy} placeholder="Generate a token or paste an existing one to test"
          onChange={e => { setToken(e.target.value); setExpiry(''); }} style={{ width: '100%', minWidth: 0 }} />
        {expiry && <span className="settings-hint">Expires {new Date(expiry).toLocaleString()}</span>}
      </div>
      <div className="settings-actions">
        <button className="settings-button" type="button" disabled={!token || busy} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>
        <button className="settings-button" type="button" disabled={!token || busy} onClick={() => copy(token, 'Token')}>Copy token</button>
        <button className="settings-button" type="button" disabled={!enabled || !token || busy} onClick={test}>Test token</button>
        <button className="settings-button is-primary" type="button" disabled={!enabled || busy} onClick={() => setConfirm('generate')}>Generate / Rotate</button>
        <button className="settings-button is-danger" type="button" disabled={!enabled || busy} onClick={() => setConfirm('revoke')}>Revoke</button>
      </div>
      {confirm && <div role="group" aria-label="Confirm connector credential change">
        <p className="settings-note">{confirm === 'generate' ? 'Replace your current connector token? Reconnect Perplexity with the new token afterward.' : 'Revoke your current connector token? Perplexity will lose access after revocation propagates.'}</p>
        <button type="button" className="settings-button" disabled={busy} onClick={confirm === 'generate' ? generate : revoke}>Confirm {confirm === 'generate' ? 'replacement' : 'revocation'}</button>{' '}
        <button type="button" className="settings-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
      </div>}
      {message && <p className={`settings-status ${failed ? 'is-error' : ''}`} role={failed ? 'alert' : 'status'}>{message}</p>}
      <details>
        <summary>Connect Perplexity</summary>
        <ol className="settings-note">
          <li>Generate and copy your connector token. Never paste it in chat.</li>
          <li>In Perplexity, add a custom remote MCP connector using the endpoint above.</li>
          <li>Configure application authentication to send Authorization: Bearer followed by your token.</li>
          <li>Your current Cloudflare Access policy may also require machine credentials. These controls do not configure that policy.</li>
          <li>Verify tool discovery in Perplexity. The browser test alone does not prove the connector works.</li>
        </ol>
      </details>
      <p className="settings-note">Token text stays only in this page's memory, not local storage. Leaving Settings clears this field, not the server credential. Avoid concurrent rotations from other devices.</p>
    </div>
  );
}
