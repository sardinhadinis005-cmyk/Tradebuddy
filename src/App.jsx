import { useEffect, useState } from 'react';

const pages = [
  { id: 'screener', label: 'Pre-Market Screener', icon: '▦' },
  { id: 'watchlist', label: 'Watchlist', icon: '☆' },
  { id: 'crypto', label: 'Crypto', icon: '₿', disabled: true },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];
function readTheme() {
  try { const value = localStorage.getItem('tradebuddy-theme'); return ['light', 'dark'].includes(value) ? value : 'system'; }
  catch { return 'system'; }
}
export default function App() {
  const [collapsed, setCollapsed] = useState(() => matchMedia('(max-width: 760px)').matches);
  const [active, setActive] = useState('screener');
  const [preference, setPreference] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = preference === 'system' ? systemDark : preference === 'dark';
  const page = pages.find(item => item.id === active);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = event => setSystemDark(event.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      if (preference === 'system') localStorage.removeItem('tradebuddy-theme');
      else localStorage.setItem('tradebuddy-theme', preference);
    } catch {}
  }, [dark, preference]);
  useEffect(() => { document.title = `${page.label} | Tradebuddy`; }, [page.label]);
  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand"><span className="brand-mark" aria-hidden="true">↗</span><span className="expanded-only brand-name">Tradebuddy<span className="accent">.</span></span></div>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-controls="sidebar-menu" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? '›' : '‹'}</button>
        <div className="sidebar-menu" id="sidebar-menu">
          <p className="menu-heading expanded-only">WORKSPACE</p>
          <nav className="flex flex-col gap-2" aria-label="Workspace">{pages.map(item => (
            <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} disabled={item.disabled} onClick={() => setActive(item.id)} aria-current={active === item.id ? 'page' : undefined} aria-label={item.disabled ? `${item.label} — Coming Soon` : item.label} title={item.disabled ? `${item.label} — Coming Soon` : item.label}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="expanded-only nav-label">{item.label}</span>{item.disabled && <span className="expanded-only soon-badge">Coming Soon</span>}
            </button>
          ))}</nav>
        </div>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setPreference(dark ? 'light' : 'dark')} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}><span className="nav-icon" aria-hidden="true">{dark ? '☀' : '☾'}</span><span className="expanded-only">{dark ? 'Light' : 'Dark'} mode</span></button>
          <button className="nav-item system-button" onClick={() => setPreference('system')} aria-pressed={preference === 'system'} aria-label="Use system theme" title="Use system theme"><span className="nav-icon" aria-hidden="true">▣</span><span className="expanded-only">Use system theme{preference === 'system' ? ' ✓' : ''}</span></button>
          <div className="identity"><span className="avatar">TB</span><div className="expanded-only"><p>Personal workspace</p><span>Tradebuddy / v0.1</span></div></div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar"><div className="breadcrumb"><span className="breadcrumb-parent">Workspace /</span><span>{page.label}</span></div><span className="status-badge"><span className="status-dot"/>Ready</span></header>
        <main className="workspace" id="workspace" tabIndex={-1}>
          <section className="page-heading" aria-labelledby="page-title"><p className="eyebrow">YOUR TRADING WORKSPACE</p><h1 id="page-title">{page.label}</h1><p className="page-description">Your edge starts with a clear workspace.</p></section>
          <section className="dashboard-canvas" aria-label={`${page.label} empty workspace`}><div className="canvas-topline" aria-hidden="true"><i/><i/><i/></div><div className="empty-state"><span className="empty-icon" aria-hidden="true">{page.icon}</span><h2>A clear space. A fresh start.</h2><p>Your {active === 'settings' ? 'workspace preferences' : 'tools and insights'} will live here.</p><span className="empty-caption">No data connected yet</span></div><div className="canvas-footer"><span>Awaiting configuration</span><span className="canvas-note">Built for focus</span></div></section>
          <footer className="page-footer"><span>Tradebuddy</span><span>Your workspace. Your next move.</span></footer>
        </main>
      </div>
    </div>
  );
}
