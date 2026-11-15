import { createTradier } from './tradier.js';
import { DEFAULT_UNIVERSE } from './universe.js';
import { etParts, shiftDate } from './time.js';
import { dailyInfo, hourlyCloses, nearestLevelDistancePct, num, round } from './analysis.js';
import { maState } from '../src/features/indicators.js';

// Free Workers plans allow 50 outbound requests per invocation. Stay below that.
const SUBREQUEST_BUDGET = 48;
const MAX_UNIVERSE = 200;
const POOL_SIZE = 4;

export function parseUniverse(text) {
  if (!text || !String(text).trim()) return [...DEFAULT_UNIVERSE];
  const seen = new Set();
  for (const part of String(text).split(/[\s,;]+/)) {
    const s = part.trim().toUpperCase();
    if (/^[A-Z]{1,5}([.-][A-Z])?$/.test(s)) seen.add(s);
  }
  return seen.size ? [...seen].slice(0, MAX_UNIVERSE) : [...DEFAULT_UNIVERSE];
}

function rowFromQuote(q, mode) {
  const symbol = typeof q?.symbol === 'string' ? q.symbol.toUpperCase() : null;
  const prev = num(q?.prevclose);
  if (!symbol || prev == null || prev <= 0) return null;
  let price;
  let ref;
  if (mode === 'review') {
    const open = num(q.open);
    const close = num(q.close);
    if (open == null || open <= 0 || close == null || close <= 0) return null;
    price = close;
    ref = open;
  } else {
    const last = num(q.last);
    if (last == null || last <= 0) return null;
    price = last;
    ref = last;
  }
  return {
    symbol,
    price,
    ref,
    gap: (ref / prev - 1) * 100,
    volume: num(q.volume),
    quoteAvgVolume: num(q.average_volume),
    bid: num(q.bid),
    ask: num(q.ask),
    tradeMs: num(q.trade_date),
  };
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const isFatal = (reason) => reason && [401, 403, 429].includes(reason.status);

export async function runScan({ env, mode = 'live', fetchImpl, now = new Date() }) {
  const sandbox = !env.TRADIER_BASE_URL || env.TRADIER_BASE_URL.includes('sandbox');
  const feed = sandbox ? 'Tradier sandbox' : 'Tradier';
  const delayMinutes = sandbox ? 15 : null;
  const meta = {
    mode,
    configured: Boolean(env.TRADIER_TOKEN),
    feed,
    delayMinutes,
    sessionDate: null,
    generatedAt: now.toISOString(),
    universeSize: 0,
    candidates: 0,
    notes: [],
  };
  if (!env.TRADIER_TOKEN) {
    meta.notes.push('No market data token is configured. Set the TRADIER_TOKEN secret on the Worker, or use demo data.');
    return { meta, candidates: [] };
  }

  const tradier = createTradier(env, fetchImpl);
  const universe = parseUniverse(env.UNIVERSE);
  meta.universeSize = universe.length;

  const minGap = num(env.MIN_GAP) ?? 1;
  const minPrice = num(env.MIN_PRICE) ?? 1;
  const minAvgVolume = num(env.MIN_AVG_VOLUME) ?? 200000;
  const batches = Math.ceil(universe.length / 100);
  const topN = Math.max(0, Math.min(num(env.TOP_N) ?? 20, Math.floor((SUBREQUEST_BUDGET - batches) / 2)));

  const { quotes, unmatched } = await tradier.quotes(universe);
  if (unmatched.length) meta.notes.push(`${unmatched.length} symbol(s) were not recognized and were skipped.`);

  let rows = quotes
    .map((q) => rowFromQuote(q, mode))
    .filter((r) => r && Number.isFinite(r.gap) && Math.abs(r.gap) >= minGap && r.price >= minPrice)
    .filter((r) => r.quoteAvgVolume == null || r.quoteAvgVolume >= minAvgVolume);

  let sessionDate;
  if (mode === 'review') {
    const counts = new Map();
    for (const r of rows) {
      if (r.tradeMs == null) continue;
      r.sessionDate = etParts(new Date(r.tradeMs)).date;
      counts.set(r.sessionDate, (counts.get(r.sessionDate) ?? 0) + 1);
    }
    sessionDate = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0]?.[0] ?? null;
    rows = rows.filter((r) => r.sessionDate === sessionDate);
  } else {
    sessionDate = etParts(now).date;
  }
  meta.sessionDate = sessionDate;

  rows.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  rows = rows.slice(0, topN);

  if (rows.length === 0) {
    meta.notes.push(
      mode === 'live'
        ? 'No symbols moved enough from the previous close. If it is before 9:30 AM ET, the feed may not include pre-market trades.'
        : 'No usable session data was found for the review.',
    );
    return { meta, candidates: [] };
  }

  let barFailures = 0;
  const candidates = await mapPool(rows, POOL_SIZE, async (row) => {
    const [hist, series] = await Promise.allSettled([
      tradier.history(row.symbol, shiftDate(sessionDate, -320), sessionDate),
      tradier.timesales(row.symbol, shiftDate(sessionDate, -12), sessionDate),
    ]);
    for (const r of [hist, series]) if (r.status === 'rejected' && isFatal(r.reason)) throw r.reason;
    if (hist.status === 'rejected' || series.status === 'rejected') barFailures++;

    const daily = hist.status === 'fulfilled' ? dailyInfo(hist.value, sessionDate) : null;
    const closes = series.status === 'fulfilled' ? hourlyCloses(series.value, sessionDate) : [];
    const direction = row.gap > 0 ? 'up' : 'down';
    const avgVolume = daily?.avgVolume ?? null;
    const volumeRatio = avgVolume && row.volume != null ? row.volume / avgVolume : null;
    const spread = mode === 'live' && row.bid > 0 && row.ask >= row.bid ? round(row.ask - row.bid, 3) : null;

    return {
      symbol: row.symbol,
      price: round(row.price),
      refPrice: round(row.ref),
      gapPercent: round(row.gap),
      rvol: mode === 'review' ? round(volumeRatio, 2) : null,
      pmVolumeRatio: mode === 'live' ? round(volumeRatio, 4) : null,
      volume: row.volume,
      avgVolume: round(avgVolume, 0),
      volumeKind: mode === 'live' ? 'premarket' : 'fullday',
      spread,
      catalyst: null,
      daily: daily?.state ?? null,
      hourly: closes.length >= 25 ? maState(closes) : null,
      levels: daily?.levels ?? {},
      nextLevelDistancePct: daily && daily.bars > 0 ? round(nearestLevelDistancePct(daily.levels, row.ref, direction)) : null,
      dataQuality: mode === 'review' ? 'review' : sandbox ? 'delayed' : 'live',
      feed,
      delayMinutes,
      quoteTime: row.tradeMs ? new Date(row.tradeMs).toISOString() : null,
      sessionDate,
      updated: now.toISOString(),
    };
  });

  if (barFailures) meta.notes.push(`Price history could not be loaded for ${barFailures} symbol(s), so some conditions show as unknown.`);
  if (mode === 'live') {
    meta.notes.push('Volume is whatever the feed reports in the quote volume field. Check it against your charting platform before trusting it.');
  }
  meta.candidates = candidates.length;
  return { meta, candidates };
}
