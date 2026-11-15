import { useState } from 'react';

export default function CsvImporter() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const handleFile = (event) => {
    setFile(event.target.files[0]);
    setError(null);
  };

  const handleImport = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.trim().split('\n');
        if (lines.length < 2) throw new Error('CSV must have a header and at least one row.');
        const headers = lines[0].split(',');
        const parsed = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((h, i) => { obj[h.trim()] = values[i] ? values[i].trim() : ''; });
          return obj;
        });
        setRows(parsed);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <section aria-label="CSV importer">
      <h3>Import historical candles</h3>
      <input type="file" accept=".csv" onChange={handleFile} />
      <button onClick={handleImport} disabled={!file}>Import</button>
      {error && <p className="error">{error}</p>}
      {rows.length && (
        <table>
          <thead><tr>{Object.keys(rows[0]).map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i}>{Object.values(row).map(v => <td key={v}>{v}</td>)}</tr>)}</tbody>
        </table>
      )}
      <p className="note">Imported CSV is local only and does not connect to a market-data provider.</p>
    </section>
  );
}
