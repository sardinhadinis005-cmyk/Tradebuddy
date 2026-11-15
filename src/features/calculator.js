export function calculateRisk({ entry, stop, target, plannedRisk, slippageBps = 0 }) {
  const e = Number(entry);
  const s = Number(stop);
  const t = Number(target);
  const risk = Number(plannedRisk);
  if (!e || !s || !risk || risk <= 0) return null;
  const distance = Math.abs(e - s);
  if (distance <= 0) return null;
  const slippage = risk * (Number(slippageBps) / 10000);
  const adjustedRisk = risk + slippage;
  const shares = Math.floor(adjustedRisk / distance);
  const reward = t ? Math.abs(t - e) * shares : null;
  const rr = reward ? reward / adjustedRisk : null;
  return { shares, distance, slippage, adjustedRisk, reward, rr, positionValue: shares * e };
}

// Planned risk is not a guaranteed maximum loss. Actual loss can exceed it due to slippage, gaps, and execution quality.
