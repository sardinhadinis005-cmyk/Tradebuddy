// Position sizing for a planned loss. Amounts are in the account currency.
// Slippage is assumed on both the entry fill and the stop fill, always against you.

export function parseNumberInput(text) {
  if (text == null) return null;
  const t = String(text).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

export function calculateRisk({
  entry,
  stop,
  target = null,
  plannedRisk,
  slippageBps = null,
  maxPositionValue = null,
  minRewardRisk = 2,
}) {
  const errors = [];
  const warnings = [];
  const missing = [];

  const check = (name, value, { required, positive }) => {
    if (value == null) {
      if (required) missing.push(name);
      return null;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${name} is not a valid number. Use a plain number such as 12.50`);
      return null;
    }
    if (positive && value <= 0) {
      errors.push(`${name} must be greater than zero`);
      return null;
    }
    if (!positive && value < 0) {
      errors.push(`${name} cannot be negative`);
      return null;
    }
    return value;
  };

  const e = check('Entry', entry, { required: true, positive: true });
  const s = check('Stop', stop, { required: true, positive: true });
  const t = check('Target', target, { required: false, positive: true });
  const risk = check('Planned risk', plannedRisk, { required: true, positive: true });
  const bps = check('Slippage', slippageBps, { required: false, positive: false }) ?? 0;
  const cap = check('Max position value', maxPositionValue, { required: false, positive: true });

  if (errors.length > 0 || missing.length > 0) {
    return { status: errors.length > 0 ? 'invalid' : 'incomplete', errors, missing, warnings };
  }
  if (e === s) {
    return { status: 'invalid', errors: ['Stop must be different from entry'], missing, warnings };
  }

  const direction = s < e ? 'long' : 'short';
  const stopDistance = Math.abs(e - s);
  const slippageAllowance = 2 * e * (bps / 10000);
  const riskPerShare = stopDistance + slippageAllowance;

  const sizedShares = Math.floor(risk / riskPerShare + 1e-9);
  const capShares = cap == null ? Infinity : Math.floor(cap / e + 1e-9);
  const shares = Math.min(sizedShares, capShares);
  const capped = capShares < sizedShares;

  if (sizedShares < 1) {
    return {
      status: 'invalid',
      errors: [`Planned risk is smaller than the risk on a single share (${riskPerShare.toFixed(4)}). Increase the risk amount or tighten the stop`],
      missing,
      warnings,
    };
  }
  if (shares < 1) {
    return { status: 'invalid', errors: ['Max position value is below the price of one share'], missing, warnings };
  }

  if (slippageAllowance > stopDistance) warnings.push('Assumed slippage is larger than the distance to the stop');
  if (capped) warnings.push('Share count is limited by the max position value');

  let grossReward = null;
  let netReward = null;
  let rewardRisk = null;
  let targetProfit = null;
  if (t != null) {
    const rightSide = direction === 'long' ? t > e : t < e;
    if (!rightSide) {
      warnings.push(`Target is on the wrong side of entry for a ${direction} trade`);
    } else {
      grossReward = Math.abs(t - e);
      netReward = grossReward - slippageAllowance;
      rewardRisk = netReward / riskPerShare;
      targetProfit = shares * netReward;
      if (rewardRisk < minRewardRisk) warnings.push(`Reward/risk after slippage is below ${minRewardRisk}:1`);
    }
  }

  return {
    status: 'ok',
    direction,
    stopDistance,
    slippageAllowance,
    riskPerShare,
    shares,
    positionValue: shares * e,
    maxLoss: shares * riskPerShare,
    capped,
    grossReward,
    netReward,
    rewardRisk,
    targetProfit,
    errors,
    missing,
    warnings,
  };
}

// Planned risk is not a guaranteed maximum loss. Gaps, halts, partial fills and fees can make the actual loss larger.
