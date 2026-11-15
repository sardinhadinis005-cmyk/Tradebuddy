import { useState } from 'react';
import { calculateRisk, parseNumberInput } from '../features/calculator.js';
import './risk.css';

const STORAGE_KEY = 'tradebuddy-risk-settings';
const DEFAULTS = { plannedRisk: '', slippageBps: '5', maxPositionValue: '' };

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      plannedRisk: typeof raw.plannedRisk === 'string' ? raw.plannedRisk : DEFAULTS.plannedRisk,
      slippageBps: typeof raw.slippageBps === 'string' ? raw.slippageBps : DEFAULTS.slippageBps,
      maxPositionValue: typeof raw.maxPositionValue === 'string' ? raw.maxPositionValue : DEFAULTS.maxPositionValue,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function amount(value, digits = 2) {
  if (value == null) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Field({ id, label, value, onChange, hint }) {
  return (
    <div className="risk-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint && <span className="risk-hint">{hint}</span>}
    </div>
  );
}

export default function RiskCalculator({ entry }) {
  const [entryText, setEntryText] = useState(entry == null || entry === '' ? '' : String(entry));
  const [stopText, setStopText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [settings, setSettings] = useState(loadSettings);

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  };

  const result = calculateRisk({
    entry: parseNumberInput(entryText),
    stop: parseNumberInput(stopText),
    target: parseNumberInput(targetText),
    plannedRisk: parseNumberInput(settings.plannedRisk),
    slippageBps: parseNumberInput(settings.slippageBps),
    maxPositionValue: parseNumberInput(settings.maxPositionValue),
  });

  return (
    <section aria-label="Risk calculator" className="risk">
      <h3>Risk calculator</h3>
      <p className="risk-note">Amounts are in your account currency. Decimal commas are accepted.</p>
      <div className="risk-grid">
        <Field id="risk-entry" label="Entry price" value={entryText} onChange={setEntryText} />
        <Field id="risk-stop" label="Stop price" value={stopText} onChange={setStopText} hint="Below entry for a long, above for a short" />
        <Field id="risk-target" label="Target price (optional)" value={targetText} onChange={setTargetText} />
        <Field id="risk-planned" label="Planned risk" value={settings.plannedRisk} onChange={(value) => updateSetting('plannedRisk', value)} hint="The most you accept to lose" />
        <Field id="risk-slippage" label="Slippage per fill (bps)" value={settings.slippageBps} onChange={(value) => updateSetting('slippageBps', value)} hint="Assumed on entry and on the stop. 100 bps = 1%" />
        <Field id="risk-cap" label="Max position value (optional)" value={settings.maxPositionValue} onChange={(value) => updateSetting('maxPositionValue', value)} />
      </div>

      <div className="risk-output" aria-live="polite">
        {result.status === 'incomplete' && (
          <p className="risk-note">Enter {result.missing.join(', ').toLowerCase()} to see the position size.</p>
        )}
        {result.status === 'invalid' && (
          <ul className="risk-errors" role="alert">
            {result.errors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
        {result.status === 'ok' && (
          <dl className="risk-results">
            <div><dt>Direction</dt><dd>{result.direction === 'long' ? 'Long' : 'Short'}</dd></div>
            <div><dt>Shares</dt><dd>{result.shares.toLocaleString()}</dd></div>
            <div><dt>Position value</dt><dd>{amount(result.positionValue)}</dd></div>
            <div><dt>Risk per share</dt><dd>{amount(result.riskPerShare, 4)}</dd></div>
            <div><dt>Loss if stopped out</dt><dd>{amount(result.maxLoss)}</dd></div>
            {result.rewardRisk != null && <div><dt>Profit at target</dt><dd>{amount(result.targetProfit)}</dd></div>}
            {result.rewardRisk != null && <div><dt>Reward/risk</dt><dd>{result.rewardRisk.toFixed(2)} : 1</dd></div>}
          </dl>
        )}
        {result.warnings.length > 0 && (
          <ul className="risk-warnings">
            {result.warnings.map((message) => <li key={message}>{message}</li>)}
          </ul>
        )}
      </div>

      <p className="risk-note">Planned risk is not a guaranteed maximum loss. Gaps, halts, partial fills and fees can make the actual loss larger.</p>
    </section>
  );
}
