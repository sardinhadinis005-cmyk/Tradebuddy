import { useEffect, useState } from 'react';
import { SETTINGS_EVENT, tradierHeaders } from '../api/tradierSettings.js';

export default function StatusBar() {
  const [session, setSession] = useState('unknown');
  const [updated, setUpdated] = useState(null);
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState('—');
  const [stale, setStale] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const bump = () => setReloadKey((key) => key + 1);
    window.addEventListener(SETTINGS_EVENT, bump);
    return () => window.removeEventListener(SETTINGS_EVENT, bump);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/session', { signal: controller.signal, headers: tradierHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) { setConnected(false); return; }
        setSession(data.session || 'unknown');
        setFeed(data.feed || '—');
        setConnected(!!data.connected);
        setUpdated(data.timestamp);
        const age = data.timestamp ? Date.now() - new Date(data.timestamp).getTime() : null;
        setStale(age !== null && age > 900000);
      })
      .catch(() => { /* Leave as unknown while a provider is not configured. */ });
    return () => controller.abort();
  }, [reloadKey]);

  const statusText = connected ? (stale ? 'Stale data' : 'Token set') : 'Not connected';
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
