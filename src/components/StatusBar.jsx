import { useEffect, useState } from 'react';
import { SETTINGS_EVENT, tradierHeaders } from '../api/tradierSettings.js';

export default function StatusBar() {
  const [state, setState] = useState({ session: 'unknown', connected: false, feed: '—', timestamp: null, failed: false });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const bump = () => setReloadKey(key => key + 1);
    window.addEventListener(SETTINGS_EVENT, bump);
    return () => window.removeEventListener(SETTINGS_EVENT, bump);
  }, []);
  useEffect(() => {
    let disposed = false;
    let request = null;
    let timeout = null;
    setState({ session: 'unknown', connected: false, feed: '—', timestamp: null, failed: false });
    const refresh = async () => {
      if (disposed || document.hidden || request) return;
      const controller = new AbortController();
      request = controller;
      timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch('/api/session', { signal: controller.signal, headers: tradierHeaders(), cache: 'no-store' });
        if (!res.ok) throw new Error('Session unavailable');
        const data = await res.json();
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid session');
        if (!disposed) setState({ session: data.session || 'unknown', connected: !!data.connected, feed: data.feed || '—', timestamp: data.timestamp || null, failed: false });
      } catch {
        if (!disposed) setState(previous => ({ ...previous, session: 'unknown', connected: false, failed: true }));
      } finally {
        clearTimeout(timeout);
        request = null;
      }
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    const resume = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', resume);
    return () => {
      disposed = true;
      clearInterval(timer);
      clearTimeout(timeout);
      request?.abort();
      document.removeEventListener('visibilitychange', resume);
    };
  }, [reloadKey]);
  const age = state.timestamp ? Date.now() - Date.parse(state.timestamp) : NaN;
  const stale = state.connected && (!Number.isFinite(age) || age > 900000);
  const text = state.failed ? 'Status unavailable' : state.connected ? stale ? 'Stale data' : 'Token set' : 'Not connected';
  const tone = state.failed ? 'warn' : state.connected ? stale ? 'warn' : 'ok' : 'off';
  const last = Number.isFinite(Date.parse(state.timestamp)) ? new Date(state.timestamp).toLocaleTimeString() : '—';
  return (
    <div className="status-bar" role="status" aria-live="polite" aria-label={`${state.session}: ${text}; ${state.feed}`} title={`${text}. Refreshes every 10 seconds while visible. Last server timestamp: ${last}`}>
      <span className={`status-indicator ${tone}`} aria-hidden="true"></span>
      <span>{state.session}</span><span>{text}</span><span>{state.feed}</span><span>{last}</span>
    </div>
  );
}
