// Looks for the retracement setup in the strategy notes on intraday bars: a clean move, a pullback of 40-60%,
// an orderly run of bars against the move, price near a rising 20-bar average, and an entry bar at the end.
// A proposed reading of those notes, not a validated signal.
export const RETRACEMENT_RULES = {
  minBarsToday: 12,
  minImpulsePct: 1,
  zoneLow: 0.4,
  zoneHigh: 0.6,
  minRun: 3,
  maxMaDistancePct: 0.6,
  maSlopeBars: 5,
  minRiskReward: 2,
  dojiBodyRatio: 0.25,
  narrowRangeRatio: 0.6,
  tailRatio: 2,
  tick: 0.01,
};

const toNum = (x) => {
  if (x == null || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

function normalize(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((b) => ({ time: String(b?.time ?? ''), open: toNum(b?.open), high: toNum(b?.high), low: toNum(b?.low), close: toNum(b?.close ?? b?.price), volume: toNum(b?.volume) }))
    .filter((b) => b.time.length >= 13 && [b.open, b.high, b.low, b.close].every((v) => v != null && v > 0) && b.high >= b.low)
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

// Mirrors prices so a short setup can be checked as a long one.
const flip = (bars) => bars.map((b) => ({ ...b, open: -b.open, close: -b.close, high: -b.low, low: -b.high }));

const sma = (values, end, period) => {
  if (end + 1 < period) return null;
  let sum = 0;
  for (let i = end - period + 1; i <= end; i++) sum += values[i];
  return sum / period;
};

function entryBarIndex(bars, from, rules) {
  const retraceRanges = bars.slice(from).map((b) => b.high - b.low);
  const avgRange = retraceRanges.length ? retraceRanges.reduce((a, b) => a + b, 0) / retraceRanges.length : 0;
  for (let i = bars.length - 1; i >= Math.max(from, bars.length - 2); i--) {
    const b = bars[i];
    const range = b.high - b.low;
    if (!(range > 0)) continue;
    const body = Math.abs(b.close - b.open);
    const lowerWick = Math.min(b.open, b.close) - b.low;
    const doji = body <= rules.dojiBodyRatio * range;
    const narrow = retraceRanges.length >= 3 && range <= rules.narrowRangeRatio * avgRange;
    const tail = lowerWick >= rules.tailRatio * Math.max(body, range * 0.05) && lowerWick >= 0.5 * range;
    if (doji || narrow || tail) return { index: i, kind: tail ? 'bottoming tail' : doji ? 'doji' : 'narrow-range bar' };
  }
  return null;
}

export function detectRetracement(rawBars, sessionDate, direction, rules = RETRACEMENT_RULES) {
  if (direction !== 'up' && direction !== 'down') return null;
  const sign = direction === 'up' ? 1 : -1;
  const original = normalize(rawBars);
  const all = direction === 'up' ? original : flip(original);
  const today = all.filter((b) => b.time.slice(0, 10) === sessionDate);
  if (today.length < rules.minBarsToday) return null;

  const factors = [];
  const add = (id, label, status, detail) => factors.push({ id, label, status, detail });
  const unmetResult = (reason) => ({ direction, found: false, grade: null, score: 0, factors: [], reason });

  let iHigh = 0;
  for (let i = 0; i < today.length; i++) if (today[i].high >= today[iHigh].high) iHigh = i;
  if (iHigh < 2) return unmetResult('No clear move before the high of the day.');
  let iLow = 0;
  for (let i = 0; i < iHigh; i++) if (today[i].low < today[iLow].low) iLow = i;
  const high = today[iHigh].high;
  const low = today[iLow].low;
  const impulse = high - low;
  const impulsePct = (impulse / Math.abs(low)) * 100;
  if (!(impulsePct >= rules.minImpulsePct)) return unmetResult(`The move was only ${impulsePct.toFixed(1)}%, below the ${rules.minImpulsePct}% minimum.`);
  if (iHigh >= today.length - 1) return unmetResult('The stock is still at its high; no pullback yet.');

  const pull = today.slice(iHigh + 1);
  const pullLow = Math.min(...pull.map((b) => b.low));
  const retracePct = (high - pullLow) / impulse;

  let run = 0;
  let best = 0;
  let flips = 0;
  for (let i = 0; i < pull.length; i++) {
    const red = pull[i].close < pull[i].open;
    run = red ? run + 1 : 0;
    best = Math.max(best, run);
    if (i > 0 && (pull[i].close < pull[i].open) !== (pull[i - 1].close < pull[i - 1].open)) flips++;
  }
  const alternating = pull.length >= 4 && flips >= pull.length - 1;
  add('sequence', 'Orderly pullback', best >= rules.minRun ? 'met' : 'unmet',
    best >= rules.minRun ? `${best} bars in a row against the move` : alternating ? 'Bars alternate color (Christmas lights)' : `Longest run against the move is ${best} bar(s)`);

  const inZone = retracePct >= rules.zoneLow && retracePct <= rules.zoneHigh;
  add('zone', 'Golden zone pullback', inZone ? 'met' : 'unmet',
    `Pulled back ${(retracePct * 100).toFixed(0)}% of the move (wanted ${rules.zoneLow * 100}-${rules.zoneHigh * 100}%)`);

  const closes = all.map((b) => b.close);
  const n = closes.length - 1;
  const maNow = sma(closes, n, 20);
  const maBefore = sma(closes, n - rules.maSlopeBars, 20);
  if (maNow == null || maBefore == null) add('ma', 'Near rising 20 average', 'unknown', 'Not enough bars for the 20-bar average');
  else {
    const distance = (Math.abs(closes[n] - maNow) / Math.abs(closes[n])) * 100;
    const rising = maNow > maBefore;
    add('ma', 'Near rising 20 average', rising && distance <= rules.maxMaDistancePct ? 'met' : 'unmet',
      `${distance.toFixed(2)}% from the 20-bar average, which is ${rising ? 'rising' : 'not rising'}`);
  }

  const entryBar = entryBarIndex(today, iHigh + 1, rules);
  add('entryBar', 'Entry bar present', entryBar ? 'met' : 'unmet', entryBar ? `A ${entryBar.kind} formed at the end of the pullback` : 'No doji, narrow-range bar or tail at the end yet');

  let entry = null;
  let stop = null;
  let riskReward = null;
  if (entryBar) {
    entry = today[entryBar.index].high + rules.tick;
    stop = pullLow - rules.tick;
    const risk = entry - stop;
    const reward = high - entry;
    riskReward = risk > 0 && reward > 0 ? reward / risk : null;
  }
  add('riskReward', 'Reward/risk to the prior high', riskReward == null ? 'unknown' : riskReward >= rules.minRiskReward ? 'met' : 'unmet',
    riskReward == null ? 'Needs an entry bar and room to the prior extreme' : `About ${riskReward.toFixed(1)}:1 to the prior ${direction === 'up' ? 'high' : 'low'}`);

  const score = factors.filter((f) => f.status === 'met').length;
  const grade = score >= 4 ? 'A' : score === 3 ? 'B' : null;
  const out = (v) => (v == null ? null : Number((sign * v).toFixed(2)));
  return {
    direction,
    found: grade != null,
    grade,
    score,
    factors,
    retracePct: Number((retracePct * 100).toFixed(1)),
    entry: out(entry),
    stop: out(stop),
    target: out(high),
    swingStart: out(low),
    riskReward: riskReward == null ? null : Number(riskReward.toFixed(2)),
    entryBar: entryBar ? entryBar.kind : null,
    reason: null,
  };
}
