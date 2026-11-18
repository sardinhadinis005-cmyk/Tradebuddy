import OpportunitySnapshot from './OpportunitySnapshot.jsx';

export default function SelectedStock({ mover, onClose }) {
  const a = mover.assessment;
  const up = a.direction === 'up';
  const gap = `${mover.gapPercent > 0 ? '+' : ''}${mover.gapPercent.toFixed(2)}%`;
  const price = Number(mover.price);
  return (
    <section className={`dashboard-card selected-stock ${up ? 'is-up' : 'is-down'}`} aria-label={`${mover.symbol} details`}>
      <div className="stock-head">
        <div>
          <h3 className="stock-symbol">{mover.symbol}</h3>
          <p className="stock-sub">{up ? 'Up' : 'Down'} move · Tier {a.tier} · {a.met} of {a.factors.length} conditions met</p>
        </div>
        <button type="button" className="stock-close" onClick={onClose} aria-label={`Close ${mover.symbol} details`}>×</button>
      </div>
      <div className="stock-figures">
        <div><span>Price</span><b>{Number.isFinite(price) ? price.toFixed(2) : '—'}</b></div>
        <div><span>Gap</span><b className="stock-gap">{up ? '▲' : '▼'} {gap}</b></div>
      </div>
      {mover.quoteTime && <p className="stock-sub">Last trade {new Date(mover.quoteTime).toLocaleString()}</p>}
      <OpportunitySnapshot mover={mover} />
    </section>
  );
}
