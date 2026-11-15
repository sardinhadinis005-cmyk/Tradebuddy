const items = [
  { id: 'trend', label: 'Clear directional trend' },
  { id: 'pullback', label: 'Orderly pullback / consolidation' },
  { id: 'pullbackDepth', label: 'Retracement depth 40–60%' },
  { id: 'maProximity', label: 'Price near rising 20 SMA' },
  { id: 'entryCandle', label: 'Entry candle formed' },
  { id: 'keyLevel', label: 'Near meaningful key level' },
  { id: 'targetRoom', label: 'Room to next level' },
  { id: 'riskPlan', label: 'Risk plan defined' },
];

export default function ChecklistPanel({ checks, onChange }) {
  return (
    <section aria-label="Setup checklist">
      <h3>Setup checklist</h3>
      <ul role="list">
        {items.map((item) => {
          const value = checks[item.id] ?? 'unknown';
          return (
            <li key={item.id}>
              <label>
                <input type="checkbox" checked={value === 'met'} onChange={() => onChange(item.id, value === 'met' ? 'unmet' : 'met')} />
                <span>{item.label}</span>
                <span>{value}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
