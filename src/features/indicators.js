export function smaSeries(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function emaSeries(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

// Summarizes the trend of a close series: stacked/rising 9 EMA and 20 SMA, plain trend, and crossover count.
export function maState(closes, { slopeBars = 5, minSlopePct = 0.05, crossLookback = 20 } = {}) {
  if (!Array.isArray(closes) || closes.length < 20 + slopeBars) return null;
  const e9 = emaSeries(closes, 9);
  const s20 = smaSeries(closes, 20);
  const n = closes.length - 1;
  const last = closes[n];
  const slopePct = ((s20[n] - s20[n - slopeBars]) / s20[n - slopeBars]) * 100;
  const e9Slope = e9[n] - e9[n - slopeBars];

  let alignment = 'none';
  if (last > e9[n] && e9[n] > s20[n] && slopePct >= minSlopePct && e9Slope > 0) alignment = 'up';
  else if (last < e9[n] && e9[n] < s20[n] && slopePct <= -minSlopePct && e9Slope < 0) alignment = 'down';

  let trend = 'flat';
  if (last > s20[n] && slopePct >= minSlopePct) trend = 'up';
  else if (last < s20[n] && slopePct <= -minSlopePct) trend = 'down';

  let crossovers = 0;
  let prevSign = 0;
  for (let i = Math.max(0, n - crossLookback + 1); i <= n; i++) {
    if (e9[i] == null || s20[i] == null) continue;
    const sign = Math.sign(e9[i] - s20[i]);
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) crossovers++;
    if (sign !== 0) prevSign = sign;
  }
  return { alignment, trend, crossovers, slopePct };
}
