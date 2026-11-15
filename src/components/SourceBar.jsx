import './sourcebar.css';

const OPTIONS = [
  { id: 'demo', label: 'Demo' },
  { id: 'live', label: 'Live (delayed)' },
  { id: 'review', label: 'Last session' },
];

export default function SourceBar({ source, onSource, onRefresh, loading }) {
  return (
    <div className="source-bar" role="group" aria-label="Data source">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`source-option ${source === option.id ? 'is-active' : ''}`}
          aria-pressed={source === option.id}
          onClick={() => onSource(option.id)}
        >
          {option.label}
        </button>
      ))}
      {source !== 'demo' && (
        <button type="button" className="source-refresh" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
