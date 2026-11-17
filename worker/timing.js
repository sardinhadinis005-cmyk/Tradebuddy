import { marketSession } from './time.js';

// Very liquid symbols trade many times a minute, so the age of their last trade shows whether the feed is held back.
export const REFERENCE_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META'];
const MIN_SAMPLES = 3;
const finite = (x) => (x == null || x === '' ? NaN : Number(x));

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function assessTiming({ sandbox, quotes = [], now = new Date() }) {
  if (sandbox) return { timing: 'delayed', delayMinutes: 15, basis: 'Tradier sandbox data is delayed about 15 minutes.', needsReference: false };
  if (marketSession(now) === 'closed') {
    return { timing: 'unverified', delayMinutes: null, basis: 'The market is closed, so recent trade times cannot show whether the feed is delayed.', needsReference: false };
  }
  const lags = quotes
    .filter((q) => REFERENCE_SYMBOLS.includes(String(q?.symbol).toUpperCase()))
    .map((q) => (now.getTime() - finite(q.trade_date)) / 60000)
    .filter(Number.isFinite);
  if (lags.length < MIN_SAMPLES) {
    return { timing: 'unverified', delayMinutes: null, basis: 'Not enough recent trades on reference symbols to judge the delay.', needsReference: true };
  }
  const m = median(lags);
  if (m > -2 && m <= 3) return { timing: 'realtime', delayMinutes: null, basis: `Reference stocks last traded a median of ${Math.max(0, m).toFixed(1)} minutes ago.`, needsReference: false };
  if (m >= 12 && m <= 18) return { timing: 'delayed', delayMinutes: Math.round(m), basis: `Reference stocks last traded a median of ${m.toFixed(0)} minutes ago.`, needsReference: false };
  return { timing: 'unverified', delayMinutes: null, basis: `Reference trades were ${m.toFixed(1)} minutes old, which does not match a clear real-time or 15-minute delayed pattern.`, needsReference: false };
}
