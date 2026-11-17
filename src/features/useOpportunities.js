import { useMemo, useState } from 'react';
import { findOpportunities } from './opportunity.js';

const KEY = 'tradebuddy-seen-opportunities';

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-300))); } catch { /* storage blocked */ }
}

// Opportunities you have not dismissed yet, so the banner only appears for new ones.
export default function useOpportunities(candidates, sessionKey, enabled) {
  const [seen, setSeen] = useState(load);
  const all = useMemo(() => (enabled ? findOpportunities(candidates, sessionKey) : []), [candidates, sessionKey, enabled]);
  const fresh = useMemo(() => all.filter((o) => !seen.includes(o.id)), [all, seen]);
  const dismiss = () => {
    const next = [...seen, ...fresh.map((o) => o.id)];
    setSeen(next);
    save(next);
  };
  return { all, fresh, dismiss };
}
