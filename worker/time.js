const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

export function etParts(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute), weekday: p.weekday };
}

// Weekday and clock only. Exchange holidays and early closes are not known here.
export function marketSession(date = new Date()) {
  const { weekday, hour, minute } = etParts(date);
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
  const m = hour * 60 + minute;
  if (m >= 240 && m < 570) return 'pre-market';
  if (m >= 570 && m < 960) return 'regular';
  if (m >= 960 && m < 1200) return 'after-hours';
  return 'closed';
}

export function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
