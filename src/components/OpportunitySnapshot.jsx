import { useMemo } from 'react';
import { buildOpportunitySnapshot } from '../features/opportunitySnapshot.js';
import PlanTrade from './PlanTrade.jsx';

export default function OpportunitySnapshot({ mover }) {
  const snapshot = useMemo(() => buildOpportunitySnapshot(mover), [mover]);
  if (!snapshot) return null;
  return (
    <section aria-label={`${snapshot.symbol} opportunity snapshot`}>
      <h4>Current opportunity</h4>
      <p>{snapshot.kind} · {snapshot.direction === 'up' ? 'Upward' : 'Downward'} setup</p>
      <p>Strategy-screen match, not an entry signal or an order.</p>
      <details>
        <summary>Why this qualifies and what is missing</summary>
        <ul>{snapshot.factors.map(f => <li key={f.id}>{f.label}: {f.status} — {f.detail}</li>)}</ul>
        {snapshot.cap && <p>{snapshot.cap}</p>}
        {snapshot.warnings.length > 0 && <><h5>Data warnings</h5><ul>{snapshot.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></>}
        <p>Snapshot captured {new Date(snapshot.capturedAt).toLocaleString()}. This panel updates with the stock data; it is not saved history.</p>
        <p>{snapshot.quoteTime ? `Quote timestamp: ${new Date(snapshot.quoteTime).toLocaleString()}. Check data freshness before using this setup.` : 'Quote freshness unverified.'}</p>
      </details>
      <PlanTrade key={snapshot.symbol} symbol={snapshot.symbol} />
    </section>
  );
}
