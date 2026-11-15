import { useState } from 'react';

function normalizeGap(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function CandidateTable({ candidates, onSelect }) {
  const [sort, setSort] = useState({ key: 'gapPercent', direction: 'desc' });
  const ordered = candidates.map(item => ({ ...item, gapPercent: normalizeGap(item.gapPercent) })).sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.direction === 'asc' ? cmp : -cmp;
  });
  return (
    <section aria-label="Watchlist candidates">
      <table role="grid" aria-sort={sort.direction === 'asc' ? 'ascending' : 'descending'}>
        <thead>
          <tr>
            <th onClick={() => setSort((s) => ({ key: 'symbol', direction: s.key === 'symbol' ? (s.direction === 'asc' ? 'desc' : 'asc') : 'asc' }))} scope="col">Symbol</th>
            <th onClick={() => setSort((s) => ({ key: 'gapPercent', direction: s.key === 'gapPercent' ? (s.direction === 'asc' ? 'desc' : 'asc') : 'desc' }))} scope="col">Gap %</th>
            <th scope="col">Bias</th>
            <th scope="col">Setup</th>
            <th onClick={() => setSort((s) => ({ key: 'volume', direction: s.key === 'volume' ? (s.direction === 'asc' ? 'desc' : 'asc') : 'desc' }))} scope="col">Volume</th>
            <th scope="col">Spread</th>
            <th scope="col">Data quality</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((item) => (
            <tr key={item.symbol} role="row" onClick={() => onSelect(item)}>
              <td role="gridcell">{item.symbol}</td>
              <td role="gridcell">{item.gapPercent == null ? '—' : item.gapPercent.toFixed(2) + '%'}</td>
              <td role="gridcell">{item.bias || '—'}</td>
              <td role="gridcell">{item.setupStatus || 'Watching'}</td>
              <td role="gridcell">{item.volume == null ? '—' : item.volume.toLocaleString()}</td>
              <td role="gridcell">{item.spread == null ? '—' : item.spread.toFixed(2)}</td>
              <td role="gridcell" title={item.dataQuality || 'unknown'}>{item.dataQuality || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {candidates.length === 0 && <p>No candidates</p>}
    </section>
  );
}
