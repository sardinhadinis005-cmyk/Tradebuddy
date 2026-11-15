const MARK = { met: '✓', unmet: '✕', unknown: '?' };
const WORD = { met: 'met', unmet: 'missed', unknown: 'unknown' };

function fixed(value, digits) {
  const n = Number(value);
  return value == null || !Number.isFinite(n) ? '—' : n.toFixed(digits);
}

function compactVolume(value) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(n);
}

function catalystText(catalyst) {
  if (catalyst === true) return 'Catalyst found (bonus)';
  if (catalyst === false) return 'No catalyst found';
  return 'Catalyst unknown';
}

export default function MoverTile({ mover, selected, watched, onSelect, onToggleWatch }) {
  const a = mover.assessment;
  const up = a.direction === 'up';
  const gapText = (mover.gapPercent > 0 ? '+' : '') + mover.gapPercent.toFixed(2) + '%';
  return (
    <article className={`mover-tile ${up ? 'is-up' : 'is-down'} ${selected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="mover-main"
        onClick={() => onSelect(mover)}
        aria-pressed={selected}
        aria-label={`${mover.symbol}, ${up ? 'up' : 'down'} ${gapText}, tier ${a.tier}, ${a.met} of ${a.factors.length} conditions met. Open details`}
      >
        <span className="mover-head">
          <span className="mover-symbol">{mover.symbol}</span>
          <span className="mover-gap">{up ? '▲' : '▼'} {gapText}</span>
        </span>
        <span className="mover-price">{fixed(mover.price, 2)}</span>
        <span className="mover-stats">
          <span>Vol {compactVolume(mover.volume)}</span>
          <span>RVOL {fixed(mover.rvol, 1)}x</span>
          <span>Spread {fixed(mover.spread, 2)}</span>
        </span>
        <span className="mover-score">{a.met} of {a.factors.length} met · {catalystText(a.catalyst)}</span>
        <span className="mover-dots" aria-hidden="true">
          {a.factors.map((f) => (
            <span key={f.id} className={`mover-dot dot-${f.status}`} title={`${f.label}: ${WORD[f.status]}. ${f.detail}`}>{MARK[f.status]}</span>
          ))}
        </span>
        {a.cap && <span className="mover-cap">{a.cap}</span>}
      </button>
      <button
        type="button"
        className="mover-watch"
        onClick={() => onToggleWatch(mover.symbol)}
        aria-pressed={watched}
      >
        {watched ? '★ Watching' : '☆ Watch'}
      </button>
    </article>
  );
}
