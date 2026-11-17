import { assessMover } from './quality.js';

// A mover is an opportunity when it is a Tier A setup, a Tier B setup with a retracement setup,
// or any rated mover with a high-grade retracement setup.
export function findOpportunities(candidates, sessionKey = '') {
  const out = [];
  for (const c of Array.isArray(candidates) ? candidates : []) {
    const a = assessMover(c);
    if (a.direction === 'flat' || a.tier === 'U' || (a.tier === 'C' && c.retracement?.grade !== 'A')) continue;
    const r = c.retracement && c.retracement.found ? c.retracement : null;
    let kind = null;
    let rank = 9;
    if (a.tier === 'A' && r) { kind = 'Tier A + retracement'; rank = 1; }
    else if (a.tier === 'A') { kind = 'Tier A setup'; rank = 2; }
    else if (r && r.grade === 'A') { kind = `Tier ${a.tier} · A-grade retracement`; rank = 3; }
    else if (a.tier === 'B' && r) { kind = 'Tier B retracement'; rank = 4; }
    if (!kind) continue;
    out.push({
      id: `${sessionKey}|${c.symbol}|${a.direction}|${kind}`,
      symbol: c.symbol,
      direction: a.direction,
      tier: a.tier,
      kind,
      rank,
      gapPercent: c.gapPercent,
      price: c.price,
      retracement: r,
    });
  }
  return out.sort((x, y) => x.rank - y.rank || Math.abs(y.gapPercent) - Math.abs(x.gapPercent));
}
