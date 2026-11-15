export const defaultChecks = {
  trend: 'unknown',
  pullback: 'unknown',
  pullbackDepth: 'unknown',
  maProximity: 'unknown',
  entryCandle: 'unknown',
  keyLevel: 'unknown',
  targetRoom: 'unknown',
  riskPlan: 'unknown',
};

export function metCount(checks = defaultChecks) {
  return Object.values(checks).filter((v) => v === 'met').length;
}

export function readiness(checks = defaultChecks) {
  const total = Object.keys(checks).length;
  const met = metCount(checks);
  return { total, met, percent: Math.round((met / total) * 100) };
}

export function assessPullbackDepth(startHigh, startLow, currentPrice) {
  if (startHigh == null || startLow == null || currentPrice == null) return 'unknown';
  const impulse = startHigh - startLow;
  if (impulse <= 0) return 'unknown';
  const depth = (startHigh - currentPrice) / impulse;
  if (depth >= 0.4 && depth <= 0.6) return 'met';
  if (depth > 0.6) return 'weak';
  return 'far';
}

// Proposed interpretation of the transcripts; not a validated trading signal.
// Pullback depth, entry-candle detection, and key-level proximity require user-defined rules.
