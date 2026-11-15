export function scanNotice(source, scan) {
  if (source === 'demo') return 'Demo data: fictional symbols and synthetic numbers. Not market data.';
  if (scan.status === 'loading') return 'Loading data…';
  if (scan.status === 'error') return `Could not load data: ${scan.error}`;
  const m = scan.meta;
  if (!m) return null;
  const notes = Array.isArray(m.notes) ? m.notes : [];
  if (!m.configured) return notes.join(' ');
  const delay = m.delayMinutes ? `, delayed about ${m.delayMinutes} minutes` : '';
  const time = m.generatedAt ? new Date(m.generatedAt).toLocaleTimeString() : '';
  const head = source === 'review'
    ? `Review of the ${m.sessionDate} regular session (${m.feed}${delay}). Gap is the open versus the previous close, and volume is for the whole day, not pre-market.`
    : `${m.feed}${delay}. Updated ${time}.`;
  return [head, ...notes].join(' ');
}

export function emptyText(source, scan) {
  if (scan.status === 'loading') return 'Loading…';
  if (scan.status === 'error') return 'Nothing to show.';
  return source === 'demo' ? 'No candidates yet.' : 'No movers matched the filters.';
}
