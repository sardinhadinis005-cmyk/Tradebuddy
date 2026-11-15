export default function MoverTicker({ candidates }) {
  const items = candidates
    .map((c) => ({ symbol: c.symbol, gap: Number(c.gapPercent) }))
    .filter((c) => c.symbol && Number.isFinite(c.gap))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 20);
  if (items.length < 2) return null;

  const row = (copy) => items.map((item) => (
    <span key={`${copy}-${item.symbol}`} className={`ticker-item ${item.gap >= 0 ? 'is-up' : 'is-down'} ${copy === 'b' ? 'is-dup' : ''}`}>
      {item.symbol} <b>{item.gap >= 0 ? '▲' : '▼'} {Math.abs(item.gap).toFixed(2)}%</b>
    </span>
  ));

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">{row('a')}{row('b')}</div>
    </div>
  );
}
