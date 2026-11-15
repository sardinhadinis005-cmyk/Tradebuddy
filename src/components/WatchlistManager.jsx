import { useEffect, useState } from 'react';

export default function WatchlistManager({ watchlist, onToggle }) {
  return (
    <section aria-label="Watchlist">
      <h3>Watchlist</h3>
      <ul>
        {watchlist.length ? watchlist.map((item) => (
          <li key={item.symbol}>
            <span>{item.symbol}</span> <span>({item.bias || 'neutral'})</span>
            <button onClick={() => onToggle(item.symbol)}>Remove</button>
          </li>
        )) : <p>No symbols saved yet.</p>}
      </ul>
    </section>
  );
}
