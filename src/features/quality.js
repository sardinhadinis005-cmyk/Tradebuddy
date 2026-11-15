export const DEFAULT_RULES = {
  minGapPct: 3,
  minRvol: 1.5,
  minPmVolumeRatio: 0.05,
  maxCrossovers: 1,
  minRiskReward: 2,
  assumedStopPct: 1,
  catalystBonus: 0.5,
  tierAScore: 4.5,
  tierBScore: 3,
  maxUnknown: 2,
};

export const TIERS = [
  { id: 'A', title: 'Tier A · Strong setups', note: 'Most conditions met, higher timeframes agree, room to the next level.' },
  { id: 'B', title: 'Tier B · Watch', note: 'Some conditions met, or capped by a counter-trend daily chart or low estimated reward/risk.' },
  { id: 'C', title: 'Tier C · Weak', note: 'Few conditions met: flat or crisscrossing averages, low relative volume, or no agreement.' },
  { id: 'U', title: 'Not enough data', note: 'Too many inputs are missing to rate these fairly.' },
];

export function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Proposed interpretation of the strategy notes; not a validated trading signal.
export function assessMover(input, rules = DEFAULT_RULES) {
  const c = {
    ...input,
    gapPercent: toNumber(input.gapPercent),
    rvol: toNumber(input.rvol),
    pmVolumeRatio: toNumber(input.pmVolumeRatio),
    nextLevelDistancePct: toNumber(input.nextLevelDistancePct),
  };
  const direction = c.gapPercent == null || c.gapPercent === 0 ? 'flat' : c.gapPercent > 0 ? 'up' : 'down';
  const factors = [];
  const add = (id, label, status, detail) => factors.push({ id, label, status, detail });

  // Full-day relative volume when available; otherwise pre-market volume as a share of the average full day.
  let volumeOk = null;
  let volumeText = 'Volume not available';
  if (c.rvol != null) {
    volumeOk = c.rvol >= rules.minRvol;
    volumeText = `relative volume ${c.rvol.toFixed(1)}x`;
  } else if (c.pmVolumeRatio != null) {
    volumeOk = c.pmVolumeRatio >= rules.minPmVolumeRatio;
    volumeText = `pre-market volume ${(c.pmVolumeRatio * 100).toFixed(1)}% of an average day`;
  }

  if (c.gapPercent == null) {
    add('momentum', 'Momentum', 'unknown', 'Gap not available');
  } else if (volumeOk == null) {
    add('momentum', 'Momentum', Math.abs(c.gapPercent) >= rules.minGapPct ? 'unknown' : 'unmet', volumeText);
  } else {
    const ok = Math.abs(c.gapPercent) >= rules.minGapPct && volumeOk;
    add('momentum', 'Momentum', ok ? 'met' : 'unmet', `Gap ${c.gapPercent.toFixed(1)}%, ${volumeText}`);
  }

  const d = c.daily;
  const h = c.hourly;
  if (!d) add('movingAverages', 'Averages stacked', 'unknown', 'Daily history not available');
  else add('movingAverages', 'Averages stacked', d.alignment === direction ? 'met' : 'unmet',
    d.alignment === direction ? `9 EMA and 20 SMA rising and stacked (${direction})` : 'Averages flat, mixed, or against the gap');

  const crosses = [d, h].filter(Boolean).map(x => x.crossovers);
  if (crosses.length === 0) add('priceAction', 'Orderly price action', 'unknown', 'No bars available');
  else {
    const worst = Math.max(...crosses);
    add('priceAction', 'Orderly price action', worst <= rules.maxCrossovers ? 'met' : 'unmet', `${worst} average crossover(s) recently`);
  }

  if (!d || !h) add('higherTimeframes', '1H and daily agree', 'unknown', 'Hourly or daily history not available');
  else {
    const ok = d.trend === direction && h.trend === direction;
    add('higherTimeframes', '1H and daily agree', ok ? 'met' : 'unmet', `Daily ${d.trend}, hourly ${h.trend}`);
  }

  if (c.nextLevelDistancePct == null) {
    add('riskReward', 'Reward/risk room', 'unknown', 'No known key level ahead, or levels not available');
  } else {
    const rr = c.nextLevelDistancePct / rules.assumedStopPct;
    add('riskReward', 'Reward/risk room', rr >= rules.minRiskReward ? 'met' : 'unmet',
      `About ${rr.toFixed(1)}:1 to the next level (assumed ${rules.assumedStopPct}% stop)`);
  }

  const met = factors.filter(f => f.status === 'met').length;
  const unknown = factors.filter(f => f.status === 'unknown').length;
  const catalystBonus = c.catalyst === true ? rules.catalystBonus : 0;
  const score = met + catalystBonus;

  let tier;
  let cap = null;
  if (direction === 'flat' || unknown > rules.maxUnknown) tier = 'U';
  else {
    tier = score >= rules.tierAScore ? 'A' : score >= rules.tierBScore ? 'B' : 'C';
    const counterTrend = d && ((direction === 'up' && d.trend === 'down') || (direction === 'down' && d.trend === 'up'));
    const rrFactor = factors.find(f => f.id === 'riskReward');
    if (tier === 'A' && counterTrend) { tier = 'B'; cap = 'Capped at B: daily trend is against the move'; }
    else if (tier === 'A' && rrFactor.status === 'unmet') { tier = 'B'; cap = 'Capped at B: estimated reward/risk is below the minimum'; }
  }
  return { direction, tier, score, met, unknown, factors, catalyst: c.catalyst ?? null, cap };
}

export function groupMovers(candidates, rules = DEFAULT_RULES) {
  const groups = {};
  for (const t of TIERS) groups[t.id] = { up: [], down: [] };
  for (const c of candidates) {
    const result = assessMover(c, rules);
    if (result.direction === 'flat') continue;
    groups[result.tier][result.direction].push({ ...c, gapPercent: toNumber(c.gapPercent), assessment: result });
  }
  for (const t of TIERS) {
    for (const side of ['up', 'down']) {
      groups[t.id][side].sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent));
    }
  }
  return groups;
}
