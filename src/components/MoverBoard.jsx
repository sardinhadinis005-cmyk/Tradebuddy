import { useMemo } from 'react';
import MoverTile from './MoverTile.jsx';
import { groupMovers, TIERS, DEFAULT_RULES } from '../features/quality.js';
import './board.css';

function Lane({ title, arrow, items, selectedSymbol, watchedSymbols, onSelect, onToggleWatch }) {
  return (
    <div className="lane">
      <h4 className="lane-title">{arrow} {title} <span className="lane-count">{items.length}</span></h4>
      {items.length > 0 ? (
        <div className="tile-grid">
          {items.map((mover) => (
            <MoverTile
              key={mover.symbol}
              mover={mover}
              selected={selectedSymbol === mover.symbol}
              watched={watchedSymbols.includes(mover.symbol)}
              onSelect={onSelect}
              onToggleWatch={onToggleWatch}
            />
          ))}
        </div>
      ) : (
        <p className="lane-empty">None</p>
      )}
    </div>
  );
}

export default function MoverBoard({ candidates, selectedSymbol, watchedSymbols = [], onSelect, onToggleWatch, demo = false }) {
  const groups = useMemo(() => groupMovers(candidates, DEFAULT_RULES), [candidates]);
  const tiers = TIERS.filter((t) => t.id !== 'U' || groups.U.up.length + groups.U.down.length > 0);

  if (!candidates.length) {
    return <p className="lane-empty">No candidates yet. Connect a data provider, or use demo data.</p>;
  }

  return (
    <div className="board">
      {demo && <p className="board-banner" role="note">Demo data: fictional symbols and synthetic numbers. Not market data.</p>}
      <p className="board-legend">
        Pre-market quality uses five conditions: momentum, stacked averages, orderly price action, 1H and daily agreement, and reward/risk room. A catalyst adds a bonus of half a point and is never required.
      </p>
      {tiers.map((tier) => (
        <section key={tier.id} className="tier" aria-labelledby={`tier-${tier.id}`}>
          <header className="tier-head">
            <h3 id={`tier-${tier.id}`}>{tier.title}</h3>
            <p>{tier.note}</p>
          </header>
          <div className="lanes">
            <Lane title="Up" arrow="▲" items={groups[tier.id].up} selectedSymbol={selectedSymbol} watchedSymbols={watchedSymbols} onSelect={onSelect} onToggleWatch={onToggleWatch} />
            <Lane title="Down" arrow="▼" items={groups[tier.id].down} selectedSymbol={selectedSymbol} watchedSymbols={watchedSymbols} onSelect={onSelect} onToggleWatch={onToggleWatch} />
          </div>
        </section>
      ))}
    </div>
  );
}
