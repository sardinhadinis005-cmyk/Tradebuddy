import { useRef, useState } from 'react';

export default function PlanTrade({ symbol }) {
  const id = useRef(null);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      id.current ||= crypto.randomUUID();
      const response = await fetch('/api/planning-requests', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.current, symbol }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Planning request failed');
      setRecord(data);
    } catch (e) { setError(e.message || 'Request failed. Retry with the same request ID.'); }
    finally { setBusy(false); }
  }
  const handoff = record ? `Read Tradebuddy planning request ${record.id} for ${record.symbol} using get_planning_request. Check its expiry and warnings, refresh market data, and research a sandbox-only options proposal linked to this request ID. Do not submit any order. If account/options access is unavailable, report the missing data rather than inventing terms.` : '';
  return <div aria-label="Plan sandbox trade">
    <p>Requests a new server-side live-scan snapshot, which may differ from this panel or use briefly cached scan data. Historical-review context is not saved by this button.</p>
    {!record && <button type="button" onClick={save} disabled={busy}>{busy ? 'Saving request…' : 'Plan trade'}</button>}
    {error && <p role="alert">{error}{id.current && ` Request ID: ${id.current}`}</p>}
    {record && <div role="status">
      <p>Sandbox research request saved. ID: {record.id}</p>
      <p>Expires {new Date(record.expiresAt).toLocaleString()}. This does not wake Perplexity, approve a trade, or submit an order.</p>
      <p>Snapshot: {record.snapshot.capturedAt}. Quote: {record.snapshot.quoteTime || 'freshness unknown'}.</p>
      {record.snapshot.warnings?.length > 0 && <ul>{record.snapshot.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      <label>Paste this into Perplexity with the Tradebuddy connector enabled:<textarea readOnly rows={6} value={handoff} onFocus={e => e.target.select()} /></label>
      <p>Requests remain pending until expiry. Proposals can reference this request ID, but completion tracking and duplicate-safe execution claiming are not implemented. Requests, snapshots and proposals are retained in account storage.</p>
    </div>}
  </div>;
}
