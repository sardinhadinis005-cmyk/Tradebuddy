import { maState } from '../src/features/indicators.js';

export const num = (x) => {
  if (x == null || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

export const round = (x, digits = 2) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(digits)));

const mean = (values) => values.reduce((s, v) => s + v, 0) / values.length;

// Uses only sessions before sessionDate, so a review of a past day never sees that day's own bars.
export function dailyInfo(rawBars, sessionDate) {
  const bars = rawBars
    .map((b) => ({ date: String(b.date ?? ''), high: num(b.high), low: num(b.low), close: num(b.close), volume: num(b.volume) }))
    .filter((b) => b.date && b.date < sessionDate && b.close != null && b.close > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (bars.length === 0) return { bars: 0, state: null, avgVolume: null, levels: {} };

  const closes = bars.map((b) => b.close);
  const last = bars[bars.length - 1];
  const recent = bars.slice(-20);
  const volumes = recent.map((b) => b.volume).filter((v) => v != null && v > 0);

  const levels = {};
  if (last.high != null) levels['Previous day high'] = round(last.high);
  if (last.low != null) levels['Previous day low'] = round(last.low);
  if (recent.length === 20) {
    levels['20-day high'] = round(Math.max(...recent.map((b) => b.high ?? b.close)));
    levels['20-day low'] = round(Math.min(...recent.map((b) => b.low ?? b.close)));
  }
  if (closes.length >= 20) levels['20 SMA'] = round(mean(closes.slice(-20)));
  if (closes.length >= 200) levels['200 SMA'] = round(mean(closes.slice(-200)));

  return {
    bars: bars.length,
    state: maState(closes),
    avgVolume: volumes.length >= 10 ? mean(volumes) : null,
    levels,
  };
}

// Builds hourly closes from 15-minute bars. Bar times are Eastern local time strings.
export function hourlyCloses(rawBars, sessionDate) {
  const sorted = rawBars
    .map((b) => ({ time: String(b.time ?? ''), close: num(b.close ?? b.price) }))
    .filter((b) => b.time.length >= 13 && b.time.slice(0, 10) < sessionDate && b.close != null)
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  const buckets = new Map();
  for (const b of sorted) buckets.set(b.time.slice(0, 13), b.close);
  return [...buckets.values()];
}

// Distance to the nearest level in the direction of the move. Null when no known level lies ahead.
export function nearestLevelDistancePct(levels, price, direction) {
  if (!(price > 0)) return null;
  const distances = Object.values(levels)
    .filter((v) => v != null && (direction === 'up' ? v > price : v < price))
    .map((v) => (Math.abs(v - price) / price) * 100);
  return distances.length ? Math.min(...distances) : null;
}
