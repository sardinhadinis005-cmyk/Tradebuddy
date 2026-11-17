import { groupMovers, TIERS } from './quality.js';

export function summarize(candidates) {
  const groups = groupMovers(candidates);
  const all = TIERS.flatMap((tier) => [...groups[tier.id].up, ...groups[tier.id].down]);
  const up = all.filter((m) => m.assessment.direction === 'up');
  const down = all.filter((m) => m.assessment.direction === 'down');
  return {
    total: all.length,
    up: up.length,
    down: down.length,
    tierA: groups.A.up.length + groups.A.down.length,
    topGainer: up.length ? up.reduce((a, b) => (b.gapPercent > a.gapPercent ? b : a)) : null,
    topDecliner: down.length ? down.reduce((a, b) => (b.gapPercent < a.gapPercent ? b : a)) : null,
  };
}

const formatGap = (gap) => `${gap > 0 ? '+' : ''}${gap.toFixed(2)}%`;

export function feedKpi(source, scan) {
  if (source === 'demo') return { value: 'Demo', sub: 'Synthetic data' };
  if (scan.status === 'loading') return { value: 'Loading…', sub: 'Fetching data' };
  if (scan.status === 'error') return { value: 'Error', sub: 'See the note below' };
  const meta = scan.meta;
  if (!meta || !meta.configured) return { value: 'No API key', sub: 'Add one in Settings' };
  if (source === 'review') return { value: 'Last session', sub: meta.sessionDate || '' };
  const time = meta.generatedAt ? new Date(meta.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const updated = time ? `Updated ${time}` : '';
  if (meta.timing === 'delayed') return { value: `Delayed ${meta.delayMinutes ?? 15} min`, sub: updated };
  if (meta.timing === 'realtime') return { value: 'Real-time', sub: updated };
  return { value: 'Live', sub: updated ? `Delay unverified · ${updated}` : 'Delay unverified' };
}

export function buildKpis({ candidates, source, scan, watchCount }) {
  const s = summarize(candidates);
  const feed = feedKpi(source, scan);
  return [
    { id: 'movers', label: 'Movers', value: String(s.total), sub: `${s.up} up · ${s.down} down` },
    { id: 'tier-a', label: 'Tier A setups', value: String(s.tierA), sub: `of ${s.total} movers` },
    { id: 'gainer', label: 'Top gainer', value: s.topGainer ? s.topGainer.symbol : '—', sub: s.topGainer ? formatGap(s.topGainer.gapPercent) : 'None', tone: s.topGainer ? 'up' : '' },
    { id: 'decliner', label: 'Top decliner', value: s.topDecliner ? s.topDecliner.symbol : '—', sub: s.topDecliner ? formatGap(s.topDecliner.gapPercent) : 'None', tone: s.topDecliner ? 'down' : '' },
    { id: 'feed', label: 'Data', value: feed.value, sub: feed.sub },
    { id: 'watch', label: 'Watchlist', value: String(watchCount), sub: watchCount === 1 ? 'symbol' : 'symbols' },
  ];
}
