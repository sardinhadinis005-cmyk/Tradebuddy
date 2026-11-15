import { useEffect, useState } from 'react';

export default function StatusBar() {
  const [session, setSession] = useState('unknown');
  const [updated, setUpdated] = useState(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState('—');
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/session', { signal: controller.signal })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        setSession(data.session || 'unknown');
        setFeed(data.feed || '—');
        setConnected(!!data.connected);
        setUpdated(data.timestamp);
        const age = data.timestamp ? Date.now() - new Date(data.timestamp).getTime() : null;
        setStale(age !== null && age > 900000);
      })
      .catch(() => { /* Leave as unknown while a provider is not configured. */ });
    return () => controller.abort();
  }, []);

  const statusText = connected ? (stale ? 'Stale data' : 'Connected') : 'Not connected';
  const className = connected ? (stale ? 'warn' : 'ok') : 'off';
  return (
    <div className="status-bar" role="status" aria-live="polite">
      <span className={`status-indicator ${className}`} aria-hidden="true"></span>
      <span>{session}</span>
      <span>{statusText}</span>
      <span>{feed}</span>
      <span>{updated ? new Date(updated).toLocaleTimeString() : '—'}</span>
    </div>
  );
}
