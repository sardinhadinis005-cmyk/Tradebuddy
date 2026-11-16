// Regular weekday schedule in New York time. Exchange holidays and early closes are not included.
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const DAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const WEEK_MINUTES = 7 * 1440;
const STEPS = [
  [240, 'pre-market'],
  [570, 'regular'],
  [960, 'after-hours'],
  [1200, 'closed'],
];
const EVENTS = [];
for (let day = 0; day < 5; day++) for (const [minute, key] of STEPS) EVENTS.push({ at: day * 1440 + minute, key });

const LABELS = { 'pre-market': 'Pre-market', regular: 'Market open', 'after-hours': 'After-hours', closed: 'Market closed' };
const NEXT_LABELS = { 'pre-market': 'Pre-market starts', regular: 'Market opens', 'after-hours': 'Market closes', closed: 'After-hours ends' };

export function sessionInfo(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  const nowAt = DAY_INDEX[p.weekday] * 1440 + hour * 60 + minute;

  let current = EVENTS[EVENTS.length - 1];
  for (const event of EVENTS) if (event.at <= nowAt) current = event;

  let next = EVENTS.find((event) => event.at > nowAt);
  let minutesToNext;
  if (next) minutesToNext = next.at - nowAt;
  else {
    next = EVENTS[0];
    minutesToNext = next.at + WEEK_MINUTES - nowAt;
  }

  return {
    key: current.key,
    label: LABELS[current.key],
    nextLabel: NEXT_LABELS[next.key],
    minutesToNext,
    etTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export function formatCountdown(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
}
