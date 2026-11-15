const MARK = { met: '✓', unmet: '✕', unknown: '?' };
const WORD = { met: 'Met', unmet: 'Missed', unknown: 'Unknown' };

export default function FactorList({ factors }) {
  return (
    <ul className="factor-list">
      {factors.map((f) => (
        <li key={f.id} className={`factor factor-${f.status}`}>
          <span className="factor-mark" aria-hidden="true">{MARK[f.status]}</span>
          <span className="factor-text">
            <span className="factor-label">{f.label}: {WORD[f.status]}</span>
            <span className="factor-detail">{f.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
