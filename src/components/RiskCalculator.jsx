import { useState } from 'react';

export default function RiskCalculator({ entry, stop, target, onChange }) {
  const [plannedRisk, setPlannedRisk] = useState('');
  const [slippageBps, setSlippageBps] = useState('10');
  const calculate = () => {
    const e = Number(entry);
    const s = Number(stop);
    const t = Number(target);
    const risk = Number(plannedRisk);
    if (!e || !s || !risk || risk <= 0) return null;
    const distance = Math.abs(e - s);
    if (distance <= 0) return null;
    const slippage = risk * (Number(slippageBps || 0) / 10000);
    const adjustedRisk = risk + slippage;
    const shares = Math.floor(adjustedRisk / distance);
    const reward = t ? Math.abs(t - e) * shares : null;
    const rr = reward ? reward / adjustedRisk : null;
    return { shares, distance, slippage, adjustedRisk, reward, rr, positionValue: shares * e };
  };
  const result = calculate();
  return (
    <section aria-label="Risk calculator">
      <h3>Risk calculator</h3>
      <div className="risk-inputs">
        <label>Planned risk <input type="number" value={plannedRisk} onChange={(e) => setPlannedRisk(e.target.value)} /></label>
        <label>Slippage (bps) <input type="number" value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} /></label>
      </div>
      <div className="risk-results">
        {result ? (
          <ul>
            <li>Shares: {result.shares.toLocaleString()}</li>
            <li>Position value: {result.positionValue.toLocaleString()}</li>
            <li>Planned risk: {result.adjustedRisk.toFixed(2)}</li>
            <li>Reward/risk: {result.rr ? result.rr.toFixed(2) + ':1' : '—'}</li>
          </ul>
        ) : <p>Enter entry, stop, and planned risk.</p>}
      </div>
      <p className="note">Planned risk is not a guaranteed maximum loss. Slippage, gaps, and execution quality can increase actual loss.</p>
    </section>
  );
}
