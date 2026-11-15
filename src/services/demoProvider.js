import { maState } from '../features/indicators.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic synthetic series: trends drift steadily, range-bound profiles oscillate around a fixed level.
function series(seed, length, start, kind) {
  const rand = seeded(seed);
  const out = [];
  for (let i = 0; i < length; i++) {
    const noise = (rand() - 0.5) * 2;
    if (kind === 'cleanUp') out.push(start * (1 + 0.007 * i + 0.002 * noise));
    else if (kind === 'cleanDown') out.push(start * (1 - 0.006 * i + 0.002 * noise));
    else if (kind === 'choppy') out.push(start * (1 + 0.03 * Math.sin(i * 1.3) + 0.01 * noise));
    else out.push(start * (1 + 0.004 * noise));
  }
  return out;
}

// Fictional symbols and synthetic numbers: demo data only, never real market data.
const DEMO = [
  { symbol: 'ALFA', gap: 9.2, rvol: 3.1, pmVol: 2400000, spread: 0.01, catalyst: true, daily: 'cleanUp', hourly: 'cleanUp', room: 3.4 },
  { symbol: 'BRVO', gap: 6.4, rvol: 2.2, pmVol: 1500000, spread: 0.02, catalyst: false, daily: 'cleanUp', hourly: 'cleanUp', room: 2.6 },
  { symbol: 'CHRL', gap: 4.1, rvol: 1.8, pmVol: 900000, spread: 0.02, catalyst: null, daily: 'cleanUp', hourly: 'choppy', room: 2.5 },
  { symbol: 'DLTA', gap: 3.6, rvol: 0.9, pmVol: 300000, spread: 0.06, catalyst: false, daily: 'flat', hourly: 'flat', room: 1.2 },
  { symbol: 'ECHO', gap: 12.0, rvol: 4.0, pmVol: 3100000, spread: 0.03, catalyst: true, daily: 'cleanDown', hourly: 'cleanDown', room: 5.0 },
  { symbol: 'FOXT', gap: -8.1, rvol: 2.7, pmVol: 2000000, spread: 0.01, catalyst: true, daily: 'cleanDown', hourly: 'cleanDown', room: 3.2 },
  { symbol: 'GOLF', gap: -5.2, rvol: 1.9, pmVol: 1100000, spread: 0.02, catalyst: false, daily: 'cleanDown', hourly: 'cleanDown', room: 1.5 },
  { symbol: 'HTEL', gap: -3.3, rvol: 1.1, pmVol: 400000, spread: 0.05, catalyst: false, daily: 'choppy', hourly: 'choppy', room: 2.2 },
  { symbol: 'IOTA', gap: 7.0, rvol: null, pmVol: null, spread: null, catalyst: null, daily: null, hourly: null, room: null },
];

export function getDemoCandidates() {
  return DEMO.map((d, index) => {
    const base = 20 + index * 7;
    const dailyCloses = d.daily ? series(100 + index, 60, base, d.daily) : null;
    const hourlyCloses = d.hourly ? series(200 + index, 60, base, d.hourly) : null;
    const prevClose = dailyCloses ? dailyCloses[dailyCloses.length - 1] : base;
    return {
      symbol: d.symbol,
      price: Number((prevClose * (1 + d.gap / 100)).toFixed(2)),
      gapPercent: d.gap,
      rvol: d.rvol,
      volume: d.pmVol,
      spread: d.spread,
      catalyst: d.catalyst,
      daily: dailyCloses ? maState(dailyCloses) : null,
      hourly: hourlyCloses ? maState(hourlyCloses) : null,
      nextLevelDistancePct: d.room,
      dataQuality: 'demo',
      updated: new Date().toISOString(),
    };
  });
}

export function getDemoLevel(symbol, price) {
  const p = Number(price) || 100;
  return {
    symbol,
    currentPrice: p,
    levels: {
      'Previous day high': Number((p * 0.98).toFixed(2)),
      'Previous day low': Number((p * 0.95).toFixed(2)),
      '20 SMA': Number((p * 0.97).toFixed(2)),
      '200 SMA': Number((p * 0.9).toFixed(2)),
    },
  };
}

// Demo data is synthetic and does not represent market data or trading advice.
