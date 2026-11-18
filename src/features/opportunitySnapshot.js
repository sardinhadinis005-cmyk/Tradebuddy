import { findOpportunities } from './opportunity.js';
import { assessMover, toNumber } from './quality.js';

export function buildOpportunitySnapshot(mover, { capturedAt = new Date().toISOString(), sessionKey = '' } = {}) {
  if (!mover) return null;
  const opportunity = findOpportunities([mover], sessionKey)[0];
  if (!opportunity) return null;
  const assessment = assessMover(mover);
  const quoteMs = mover.quoteTime == null ? NaN : new Date(mover.quoteTime).getTime();
  const warnings = assessment.factors.filter(f => f.status === 'unknown').map(f => f.detail);
  if (!Number.isFinite(quoteMs)) warnings.push('Quote timestamp unavailable; freshness cannot be verified.');
  if (toNumber(mover.price) == null) warnings.push('Current price unavailable.');
  return {
    schemaVersion: 1, id: opportunity.id, symbol: mover.symbol, capturedAt,
    quoteTime: Number.isFinite(quoteMs) ? new Date(quoteMs).toISOString() : null,
    kind: opportunity.kind, rank: opportunity.rank, tier: assessment.tier, direction: assessment.direction,
    price: toNumber(mover.price), gapPercent: toNumber(mover.gapPercent),
    rvol: toNumber(mover.rvol), pmVolumeRatio: toNumber(mover.pmVolumeRatio),
    nextLevelDistancePct: toNumber(mover.nextLevelDistancePct),
    factors: assessment.factors.map(f => ({ ...f })), cap: assessment.cap,
    retracement: opportunity.retracement ? JSON.parse(JSON.stringify(opportunity.retracement)) : null,
    warnings, researchOnly: true, executable: false,
  };
}
