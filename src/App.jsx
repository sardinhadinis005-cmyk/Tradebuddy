import { useEffect, useState } from 'react';
import StatusBar from './components/StatusBar.jsx';
import CandidateTable from './components/CandidateTable.jsx';
import ChecklistPanel from './components/ChecklistPanel.jsx';
import RiskCalculator from './components/RiskCalculator.jsx';
import KeyLevelPanel from './components/KeyLevelPanel.jsx';
import WatchlistManager from './components/WatchlistManager.jsx';
import CsvImporter from './components/CsvImporter.jsx';
import { getDemoCandidates, getDemoLevel } from './services/demoProvider.js';
import { defaultChecks, readiness } from './features/setupAssessment.js';
import './styles.css';

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
  const [selected, setSelected] = useState(null);
  const [candidates, setCandidates] = useState(getDemoCandidates());
  const [watchlist, setWatchlist] = useState([]);
  const [checks, setChecks] = useState(defaultChecks);
  const [levels, setLevels] = useState({});
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

  const handleToggleWatchlist = (symbol) => {
    setWatchlist(prev => prev.some(item => item.symbol === symbol)
      ? prev.filter(item => item.symbol !== symbol)
      : [...prev, { symbol, bias: 'neutral' }]);
  };

  const handleCheck = (id, value) => {
    setChecks(prev => ({ ...prev, [id]: value }));
  };

  const selectedLevel = selected ? getDemoLevel(selected.symbol, selected.price || 100) : null;
  const readinessState = readiness(checks);

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
        <header className="topbar"><div className="breadcrumb"><span className="breadcrumb-parent">Workspace /</span><span>{page.label}</span></div><StatusBar /></header>
        <main className="workspace" id="workspace" tabIndex={-1}>
          <section className="page-heading" aria-labelledby="page-title"><p className="eyebrow">YOUR TRADING WORKSPACE</p><h1 id="page-title">{page.label}</h1><p className="page-description">Your edge starts with a clear workspace.</p></section>

          {active === 'screener' && (
            <section className="dashboard-row">
              <div className="dashboard-card candidates">
                <CandidateTable candidates={candidates} onSelect={setSelected} />
              </div>
              {selected && (
                <div className="dashboard-card selected-detail">
                  <h3>{selected.symbol}</h3>
                  <p>Gap: {selected.gapPercent == null ? '—' : selected.gapPercent + '%'} · Bias: {selected.bias || '—'}</p>
                  <ChecklistPanel checks={checks} onChange={handleCheck} />
                  <KeyLevelPanel currentPrice={selected.price || 100} levels={selectedLevel ? selectedLevel.levels : {}} onChange={setLevels} />
                  <RiskCalculator entry={selected.price || ''} stop={null} target={null} />
                </div>
              )}
            </section>
          )}

          {active === 'watchlist' && (
            <section>
              <WatchlistManager watchlist={watchlist} onToggle={handleToggleWatchlist} />
              {watchlist.length && <p>Select symbols from the screener to monitor their setup state.</p>}
            </section>
          )}

          {active === 'settings' && (
            <section>
              <h3>Data import</h3>
              <CsvImporter />
              <p className="note">Demo data is synthetic and does not represent market data or trading advice.</p>
            </section>
          )}

          {!candidates.length && active === 'screener' && <p>No candidates</p>}

          <footer className="page-footer"><span>Tradebuddy</span><span>Readiness: {readinessState.met}/{readinessState.total}</span></footer>
        </main>
      </div>
    </div>
  );
}
