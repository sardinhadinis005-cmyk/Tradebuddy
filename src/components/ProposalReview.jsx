import { useEffect, useState } from 'react';
import { listProposals, submitProposalReview } from '../api/proposals.js';
import './proposalReview.css';
const labels = { pending_review: 'Awaiting your review', approved: 'Approved for later', awaiting_perplexity_submission: 'Awaiting Perplexity submission', rejected: 'Rejected', expired: 'Expired' };
const money = value => Number.isFinite(value) ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value) : 'Unavailable';

function ProposalCard({ proposal, onSaved }) {
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const p = proposal;
  const t = p.terms;
  const expired = !Number.isFinite(Date.parse(p.expiresAt)) || Date.parse(p.expiresAt) <= now;
  const reviewable = t.environment === 'sandbox' && !expired && ['pending_review', 'approved'].includes(p.status);
  async function act(action) {
    if (busy || !reviewable) return;
    setBusy(true); setError('');
    try { const result = await submitProposalReview(p.id, action, p.version); setConfirm(false); onSaved(result); }
    catch (e) { setError(`${e.message} Do not assume the decision failed to save; refresh before retrying.`); }
    finally { setBusy(false); }
  }
  return <article className="proposal-card" aria-label={`${t.symbol} proposal version ${p.version}`} aria-busy={busy}>
    <h5>{t.symbol} · Sandbox proposal</h5>
    <p role="status">{expired && ['pending_review', 'approved', 'awaiting_perplexity_submission'].includes(p.status) ? 'Expired' : labels[p.status] || p.status}</p>
    <dl className="proposal-terms">
      <dt>Account</dt><dd title="Account identifier masked">…{String(t.accountId).slice(-4)}</dd>
      <dt>Contract</dt><dd>{t.optionSymbol}</dd>
      <dt>Action</dt><dd>{t.side}</dd>
      <dt>Quantity</dt><dd>{t.quantity}</dd>
      <dt>Order</dt><dd>{t.orderType} · {t.duration}</dd>
      <dt>Limit premium</dt><dd>{money(t.limitPrice)} per share</dd>
      <dt>Expiry</dt><dd>{new Date(p.expiresAt).toLocaleString()}</dd>
      <dt>Version</dt><dd>{p.version}</dd>
    </dl>
    <p>Confirm the contract multiplier, estimated debit and fees against the broker preview. They are not verified here.</p>
    <details><summary>Research rationale</summary><p>{p.thesis}</p><h6>Invalidation</h6><p>{p.invalidation}</p><p>Proposal ID: {p.id}</p></details>
    {reviewable && !confirm && <div className="proposal-actions">
      <button type="button" className="settings-button" disabled={busy} onClick={() => act('reject')}>Reject</button>
      <button type="button" className="settings-button" disabled={busy || p.status === 'approved'} onClick={() => act('approve_later')}>Approve for later</button>
      <button type="button" className="settings-button is-primary" disabled={busy} onClick={() => setConfirm(true)}>Approve and Send</button>
    </div>}
    {confirm && reviewable && <div className="proposal-confirm" role="group" aria-label="Confirm submission request">
      <p>Queue sandbox {t.side} for {t.quantity} × {t.optionSymbol}, limit {money(t.limitPrice)}, {t.duration}, account …{String(t.accountId).slice(-4)}?</p>
      <p>This does not submit an order or wake Perplexity. Open Perplexity to process the queue; a separate execution confirmation is still required.</p>
      <button type="button" className="settings-button is-primary" disabled={busy} onClick={() => act('approve_send')}>{busy ? 'Saving…' : 'Confirm approval and queue'}</button>
      <button type="button" className="settings-button" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
    </div>}
    {error && <p role="alert">{error}</p>}
  </article>;
}

export default function ProposalReview({ symbol }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setItems([]); setCursor(null);
    listProposals(null, controller.signal).then(page => { if (!controller.signal.aborted) { setItems(page.items); setCursor(page.cursor); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [symbol, refresh]);
  async function more() {
    if (busy || !cursor) return;
    setBusy(true); setError('');
    try { const page = await listProposals(cursor); setItems(old => [...new Map([...old, ...page.items].map(p => [p.id, p])).values()]); setCursor(page.cursor); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function saved(result) { setItems(old => old.map(p => p.id === result.id ? result : p)); }
  const matching = items.filter(p => p.terms?.symbol === symbol);
  return <section className="proposal-review" aria-label={`${symbol} trade proposal review`}>
    <h4>Trade proposal review</h4>
    <p>Sandbox only. Approval records your decision; it never places an order here.</p>
    <button type="button" className="settings-button" disabled={loading || busy} onClick={() => setRefresh(n => n + 1)}>Refresh proposals</button>
    {loading && <p role="status">Loading proposals…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && matching.length === 0 && <p>No proposals for {symbol} in the loaded history.{cursor ? ' Load more history to continue searching.' : ''}</p>}
    {matching.map(p => <ProposalCard key={`${p.id}:${p.version}`} proposal={p} onSaved={saved} />)}
    {cursor && <button type="button" className="settings-button" disabled={busy || loading} onClick={more}>{busy ? 'Loading…' : 'Load more history'}</button>}
  </section>;
}
