export const DEFAULT_STEPS = [25, 50, 75, 100];

// Price levels at each percentage of the way from entry to the desired target.
export function targetLadder({ entry, target, direction, steps = DEFAULT_STEPS }) {
  const e = Number(entry);
  const t = Number(target);
  if (!Number.isFinite(e) || !Number.isFinite(t) || e <= 0) return [];
  const sign = direction === 'down' ? -1 : 1;
  if ((t - e) * sign <= 0) return [];
  return steps.map((pct) => ({ pct, price: Number((e + (t - e) * (pct / 100)).toFixed(2)) }));
}

export function parseSteps(text) {
  const values = String(text ?? '').split(/[\s,;]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 200);
  const unique = [...new Set(values.map((n) => Math.round(n * 10) / 10))].sort((a, b) => a - b);
  return unique.length ? unique : [...DEFAULT_STEPS];
}

// Every percentage step up to 100 for an increment such as 25.
export function stepsFromIncrement(increment) {
  const inc = Number(increment);
  if (!(inc >= 1 && inc <= 100)) return [...DEFAULT_STEPS];
  const steps = [];
  for (let p = inc; p < 100; p += inc) steps.push(Number(p.toFixed(1)));
  steps.push(100);
  return steps;
}
