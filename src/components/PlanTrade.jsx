import { useRef, useState } from 'react';

export default function PlanTrade({ symbol }) {
  const id = useRef(null);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const prompt = r => `Read Tradebuddy planning request ${r.id} for ${r.symbol} using get_planning_request. This research is for my live Tradier account, not a sandbox account. Verify the saved request environment and report any mismatch; do not relabel sandbox records as live or bypass environment restrictions. Check expiry and warnings, refresh market data, and research the setup using verified account and options data. Do not create a sandbox proposal for my live account. If live-account proposals are unsupported, provide research only and explain the limitation. Do not submit any order. If account/options access is unavailable, report missing data rather than inventing terms.`;
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); setCopyStatus('Copied. Paste into Perplexity with Tradebuddy enabled.'); }
    catch { setCopyStatus('Automatic copy unavailable. Use Copy again or expand the handoff text to copy manually.'); }
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError(''); setCopyStatus('');
    try {
      id.current ||= crypto.randomUUID();
      const response = await fetch('/api/planning-requests', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.current, symbol }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Planning request failed');
      setRecord(data);
      await copy(prompt(data));
    } catch (e) { setError(e.message || 'Request failed. Retry with the same request ID.'); }
    finally { setBusy(false); }
  }
  return <div aria-label="Plan trade research">
    <p>Research for your live-account setup. Planning does not authorize trading. The current proposal workflow remains sandbox-only; live-account proposals and execution are not enabled by this screen.</p>
    <p>Requests a new server-side live-scan snapshot, which may differ from this panel or use briefly cached scan data. Historical-review context is not saved by this button.</p>
    {!record && <button type="button" onClick={save} disabled={busy}>{busy ? 'Saving request…' : 'Plan trade and copy handoff'}</button>}
    {error && <p role="alert">{error}{id.current && ` Request ID: ${id.current}`}</p>}
    {record && <div>
      <p>Research request saved. ID: {record.id}</p>
      <p>Expires {new Date(record.expiresAt).toLocaleString()}. This does not wake Perplexity, approve a trade, or submit an order.</p>
      <p>Snapshot: {record.snapshot.capturedAt}. Quote: {record.snapshot.quoteTime || 'freshness unknown'}.</p>
      {record.snapshot.warnings?.length > 0 && <ul>{record.snapshot.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      <p role="status">{copyStatus}</p>
      <button type="button" onClick={() => copy(prompt(record))}>Copy Perplexity handoff</button>
      <details><summary>Show handoff text</summary><label>Paste into Perplexity with Tradebuddy enabled:<textarea readOnly rows={6} value={prompt(record)} onFocus={e => e.target.select()} /></label></details>
      <p>Requests remain pending until expiry. Completion tracking and duplicate-safe execution claiming are not implemented. Requests, snapshots and proposals are retained in account storage.</p>
    </div>}
  </div>;
}
