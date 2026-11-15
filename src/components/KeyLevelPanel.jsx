import { useState } from 'react';

export default function KeyLevelPanel({ currentPrice, levels, onChange }) {
  const [edited, setEdited] = useState(levels);
  const row = (label, value) => {
    const num = Number(value);
    const distance = currentPrice && num ? (currentPrice - num).toFixed(2) : '—';
    return (
      <tr key={label}>
        <td>{label}</td>
        <td>{value == null ? '—' : value}</td>
        <td>{distance}</td>
      </tr>
    );
  };
  return (
    <section aria-label="Key levels">
      <h3>Key levels</h3>
      <table>
        <thead><tr><th>Level</th><th>Price</th><th>Distance from current</th></tr></thead>
        <tbody>
          {Object.entries(edited).map(([label, value]) => row(label, value))}
        </tbody>
      </table>
      <p>Add or edit levels to mark prior-day high/low, support, resistance, and whole-dollar zones.</p>
    </section>
  );
}
