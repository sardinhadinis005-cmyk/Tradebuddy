import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function PatternDiagram({ direction }) {
  const dialog = useRef(null);
  const trigger = useRef(null);
  const uid = useId();
  const up = direction === 'up';
  if (!['up', 'down'].includes(direction)) return null;
  const points = up ? '30,230 70,185 90,195 135,125 170,75 205,112 235,95 265,135 295,115' : '30,60 70,105 90,95 135,165 170,215 205,178 235,195 265,155 295,175';
  const future = up ? 'M295 115 L330 90 L355 108 L415 40' : 'M295 175 L330 200 L355 182 L415 250';
  const invalidY = up ? 153 : 137;
  const targetY = up ? 35 : 255;
  const notes = [
    ['Initial move', 'The solid line illustrates an initial directional move. It is not a trace of this symbol’s actual prices.'],
    ['Pullback', 'Price retraces against the initial move. Whether a real pullback qualifies must be checked against verified candles and the strategy rules.'],
    ['Invalidation area', 'The red band illustrates where a setup might fail. Its position is conceptual, not a calculated stop price.'],
    ['Conditional continuation', 'The dashed arrow shows one possible continuation after confirmation. It is not a prediction or an entry instruction.'],
    ['Next area to assess', 'The green band represents a possible next level to evaluate. It is not a verified target or guaranteed outcome.']
  ];
  const marks = [[110, up ? 160 : 130], [230, up ? 80 : 210], [340, invalidY], [365, up ? 90 : 210], [440, targetY]];
  return <>
    <button ref={trigger} type="button" className="settings-button" onClick={() => dialog.current.showModal()}>Explain pattern</button>
    {createPortal(<dialog ref={dialog} aria-labelledby={`${uid}-title`} onClose={() => trigger.current?.focus()} style={{ width: 'min(760px, calc(100vw - 32px))', maxHeight: '85dvh', overflow: 'auto', boxSizing: 'border-box', background: '#131c24', color: '#edf3f8', border: '1px solid #486072', borderRadius: 16, padding: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><h2 id={`${uid}-title`} style={{ margin: 0 }}>{up ? 'Upward' : 'Downward'} pullback example</h2><button type="button" className="settings-button" aria-label="Close pattern explanation" onClick={() => dialog.current.close()}>Close</button></header>
      <p>Illustrative — not actual price data. This generic pattern does not establish that the selected symbol has formed it.</p>
      <svg viewBox="0 0 480 290" role="img" aria-labelledby={`${uid}-svg-title ${uid}-desc`} style={{ display: 'block', width: '100%', background: '#0c141c', borderRadius: 12 }}>
        <title id={`${uid}-svg-title`}>Illustrative {up ? 'upward' : 'downward'} pullback</title>
        <desc id={`${uid}-desc`}>A directional move, a pullback, a conceptual red invalidation band, and a dashed possible continuation toward a conceptual green level. Numbers correspond to explanations below. No real price or time scale.</desc>
        <defs><marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#9bcbff" /></marker></defs>
        <rect x="180" y={invalidY - 10} width="280" height="20" fill="#ef657d" opacity=".22" />
        <rect x="300" y={targetY - 9} width="160" height="18" fill="#56dba2" opacity=".23" />
        <polyline points={points} fill="none" stroke="#e0ebf7" strokeWidth="3" strokeLinejoin="round" />
        <path d={future} fill="none" stroke="#9bcbff" strokeWidth="3" strokeDasharray="7 6" markerEnd={`url(#${uid}-arrow)`} />
        {marks.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="12" fill="#263f54" stroke="#b6cee2" /><text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="12">{i + 1}</text></g>)}
        <text x="18" y="280" fill="#b7c9d8" fontSize="11">Conceptual geometry · No real price or time scale</text>
      </svg>
      <ol style={{ paddingLeft: 24, lineHeight: 1.6 }}>{notes.map(([label, explanation]) => <li key={label} style={{ margin: '12px 0' }}><strong>{label}</strong><p style={{ margin: '3px 0', color: '#bfcedc' }}>{explanation}</p></li>)}</ol>
      <p>Live chart candles, calculated levels and order details are not supplied by this drawing. No order is authorized or submitted.</p>
    </dialog>, document.body)}
  </>;
}
