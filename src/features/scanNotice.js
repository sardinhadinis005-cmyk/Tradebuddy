export function scanNotice(source, scan) {
  if (source === 'demo') return 'Demo data: fictional symbols and synthetic numbers. Not market data.';
  if (scan.status === 'loading') return 'Loading data…';
  if (scan.status === 'error') return `Could not load data: ${scan.error}`;
  const m = scan.meta;
  if (!m) return null;
  const notes = Array.isArray(m.notes) ? m.notes : [];
  if (!m.configured) return notes.join(' ');
  const time = m.generatedAt ? new Date(m.generatedAt).toLocaleTimeString() : '';
  if (source === 'review') {
    return [`Review of the ${m.sessionDate} regular session (${m.feed}). Gap is the open versus the previous close, and volume is for the whole day, not pre-market.`, ...notes].join(' ');
  }
  const timing = m.timing === 'delayed' ? `, delayed about ${m.delayMinutes ?? 15} minutes`
    : m.timing === 'realtime' ? ', real-time'
    : ', delay could not be verified';
  return [`${m.feed}${timing}. Updated ${time}.`, ...notes].join(' ');
}

export function emptyText(source, scan) {
  if (scan.status === 'loading') return 'Loading…';
  if (scan.status === 'error') return 'Nothing to show.';
  return source === 'demo' ? 'No candidates yet.' : 'No movers matched the filters.';
}
