import './opportunity.css';

export default function OpportunityAlert({ items, onOpen, onDismiss }) {
  if (!items.length) return null;
  return (
    <div className='opp-alert' role='status' aria-live='polite'>
      <div className='opp-head'>
        <span className='opp-pulse' aria-hidden='true' />
        <strong>New Trade Opportunity!</strong>
        <span className='opp-count'>{items.length}</span>
      </div>
      <ul className='opp-list'>
        {items.slice(0, 4).map((o) => (
          <li key={o.id}>
            <button type='button' className='opp-item' onClick={() => onOpen(o.symbol)}>
              <b>{o.symbol}</b>
              <span className={o.direction === 'up' ? 'opp-up' : 'opp-down'}>{o.direction === 'up' ? '▲ Long' : '▼ Short'}</span>
              <span className='opp-kind'>{o.kind}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type='button' className='opp-dismiss' onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
