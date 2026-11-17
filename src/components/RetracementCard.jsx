import { targetLadder } from '../features/targets.js';
import './opportunity.css';

const MARK = { met: '✓', unmet: '✕', unknown: '?' };
const money = (v) => (v == null ? '—' : Number(v).toFixed(2));

export default function RetracementCard({ retracement }) {
  const r = retracement;
  if (!r) return null;
  const ladder = r.entry && r.target ? targetLadder({ entry: r.entry, target: r.target, direction: r.direction }) : [];
  return (
    <section className='dashboard-card retr-card' aria-label='Retracement setup'>
      <h3 className='rail-title'>Retracement setup{r.grade ? ` · Grade ${r.grade}` : ''}</h3>
      {r.factors.length === 0 ? (
        <p className='note'>{r.reason || 'No retracement setup right now.'}</p>
      ) : (
        <ul className='retr-factors'>
          {r.factors.map((f) => (
            <li key={f.id} className={`retr-factor is-${f.status}`}>
              <span className='retr-mark' aria-hidden='true'>{MARK[f.status]}</span>
              <span><b>{f.label}.</b> {f.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {r.entry != null && (
        <dl className='retr-levels'>
          <div><dt>Entry</dt><dd>{money(r.entry)}</dd></div>
          <div><dt>Stop</dt><dd>{money(r.stop)}</dd></div>
          <div><dt>Target</dt><dd>{money(r.target)}</dd></div>
        </dl>
      )}
      {ladder.length > 0 && (
        <div className='retr-ladder'>
          <p className='note'>Profit steps from entry to target</p>
          <ul>
            {ladder.map((s) => <li key={s.pct}><span>{s.pct}%</span><b>{money(s.price)}</b></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
