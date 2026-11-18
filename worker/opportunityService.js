import { resolveCredentials, cacheKey } from './credentials.js';
import { userId } from './vault.js';
import { runScan } from './scan.js';
import { findOpportunities } from '../src/features/opportunity.js';
import { buildOpportunitySnapshot } from '../src/features/opportunitySnapshot.js';
const cache = new Map();
const TTL = 60000;

export async function readOpportunities(env, email, { mode = 'live', now = new Date(), fetchImpl } = {}) {
  if (!['live', 'review'].includes(mode)) throw new Error('Invalid mode');
  const credentials = await resolveCredentials(env, email);
  if (credentials.error || !credentials.env?.TRADIER_TOKEN) throw new Error('Market data credentials unavailable');
  const key = `${await userId(email)}|${await cacheKey(mode, credentials)}`;
  const hit = cache.get(key);
  const age = hit ? now.getTime() - hit.at : -1;
  let scan;
  if (hit && age >= 0 && age < TTL) scan = hit.scan;
  else {
    scan = await runScan({ env: credentials.env, mode, now, fetchImpl });
    if (cache.size >= 50) cache.delete(cache.keys().next().value);
    cache.set(key, { at: now.getTime(), scan });
  }
  const candidates = new Map(scan.candidates.map(c => [c.symbol, c]));
  const items = findOpportunities(scan.candidates, scan.meta.sessionDate || '').map(opportunity => {
    const mover = candidates.get(opportunity.symbol);
    const snapshot = buildOpportunitySnapshot(mover, { capturedAt: scan.meta.generatedAt, sessionKey: scan.meta.sessionDate || '' });
    const quoteAgeSeconds = snapshot.quoteTime ? Math.round((now.getTime() - Date.parse(snapshot.quoteTime)) / 1000) : null;
    const warnings = [...snapshot.warnings];
    if (mode === 'review') warnings.push('Historical session review, not a current entry signal.');
    if (mover.dataQuality !== 'live') warnings.push(`Feed quality: ${mover.dataQuality || 'unverified'}. Do not assume real-time data.`);
    if (quoteAgeSeconds !== null && quoteAgeSeconds > 120) warnings.push('Quote is over 120 seconds old; this age threshold is not a market-session-aware freshness guarantee.');
    if (quoteAgeSeconds !== null && quoteAgeSeconds < 0) warnings.push('Quote timestamp is ahead of the retrieval clock; freshness is unverified.');
    return { ...snapshot, mode, sessionDate: scan.meta.sessionDate, feed: mover.feed || scan.meta.feed, dataQuality: mover.dataQuality || 'unverified', timing: scan.meta.timing, delayMinutes: mover.delayMinutes ?? scan.meta.delayMinutes, timingBasis: scan.meta.timingBasis, quoteAgeSeconds, levels: { ...(mover.levels || {}) }, daily: mover.daily ? { ...mover.daily } : null, hourly: mover.hourly ? { ...mover.hourly } : null, volume: mover.volume ?? null, avgVolume: mover.avgVolume ?? null, volumeKind: mover.volumeKind ?? null, spread: mover.spread ?? null, warnings };
  });
  return { items, meta: { ...scan.meta, retrievedAt: now.toISOString(), scope: 'Qualifying candidates returned by the configured screener universe and scan limits; not the whole market.', cachedScan: scan.meta.generatedAt !== now.toISOString(), researchOnly: true, executable: false } };
}
