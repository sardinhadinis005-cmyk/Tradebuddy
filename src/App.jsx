import { useEffect, useState } from 'react';
import StatusBar from './components/StatusBar.jsx';
import MarketClock from './components/MarketClock.jsx';
import MoverBoard from './components/MoverBoard.jsx';
import MoverTicker from './components/MoverTicker.jsx';
import SourceBar from './components/SourceBar.jsx';
import SelectedStock from './components/SelectedStock.jsx';
import FactorList from './components/FactorList.jsx';
import ChecklistPanel from './components/ChecklistPanel.jsx';
import RiskCalculator from './components/RiskCalculator.jsx';
import KeyLevelPanel from './components/KeyLevelPanel.jsx';
import WatchlistManager from './components/WatchlistManager.jsx';
import CsvImporter from './components/CsvImporter.jsx';
import ApiKeySettings from './components/ApiKeySettings.jsx';
import { getDemoCandidates, getDemoLevel } from './services/demoProvider.js';
import { fetchScan } from './api/scanClient.js';
import { SETTINGS_EVENT } from './api/tradierSettings.js';
import { scanNotice, emptyText } from './features/scanNotice.js';
import { buildKpis } from './features/summary.js';
import { defaultChecks, readiness } from './features/setupAssessment.js';
import './styles.css';
import './polish.css';
import './mobile.css';
import Brand from './components/Brand.jsx';

const pages = [
  { id: 'screener', label: 'Pre-Market Screener', icon: '▦', description: 'Biggest pre-market movers, grouped by the quality of the move.' },
  { id: 'watchlist', label: 'Watchlist', icon: '☆', description: 'The symbols you are keeping an eye on.' },
  { id: 'crypto', label: 'Crypto', icon: '₿', description: 'Coming soon.', disabled: true },
  { id: 'settings', label: 'Settings', icon: '⚙', description: 'Connect your market data and manage imports.' },
];

function readTheme() {
  try { const value = localStorage.getItem('tradebuddy-theme'); return ['light', 'dark'].includes(value) ? value : 'system'; }
  catch { return 'system'; }
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('screener');
  const [preference, setPreference] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [selected, setSelected] = useState(null);
  const [demoCandidates] = useState(getDemoCandidates);
  const [source, setSource] = useState('demo');
  const [reloadKey, setReloadKey] = useState(0);
  const [scan, setScan] = useState({ source: null, status: 'loading', candidates: [], meta: null, error: null });
  const [watchlist, setWatchlist] = useState([]);
  const [checks, setChecks] = useState(defaultChecks);
  const [, setLevels] = useState({});
  const dark = preference === 'system' ? systemDark : preference === 'dark';
  const page = pages.find(item => item.id === active);
  const watchedSymbols = watchlist.map(item => item.symbol);
  const view = scan.source === source ? scan : { status: 'loading', candidates: [], meta: null, error: null };
  const candidates = source === 'demo' ? demoCandidates : view.candidates;

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

  useEffect(() => {
    const reload = () => setReloadKey(key => key + 1);
    window.addEventListener(SETTINGS_EVENT, reload);
    return () => window.removeEventListener(SETTINGS_EVENT, reload);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = event => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    setSelected(null);
    if (source === 'demo') return undefined;
    const controller = new AbortController();
    setScan({ source, status: 'loading', candidates: [], meta: null, error: null });
    fetchScan(source, { signal: controller.signal })
      .then(body => setScan({ source, status: 'ready', candidates: body.candidates, meta: body.meta, error: null }))
      .catch(error => {
        if (error.name === 'AbortError') return;
        setScan({ source, status: 'error', candidates: [], meta: null, error: error.message });
      });
    return () => controller.abort();
  }, [source, reloadKey]);

  const choosePage = (id) => {
    setActive(id);
    setMenuOpen(false);
  };

  const handleToggleWatchlist = (symbol) => {
    setWatchlist(prev => prev.some(item => item.symbol === symbol)
      ? prev.filter(item => item.symbol !== symbol)
      : [...prev, { symbol, bias: 'neutral' }]);
  };

  const handleCheck = (id, value) => {
    setChecks(prev => ({ ...prev, [id]: value }));
  };

  const entryPrice = selected ? (selected.refPrice ?? selected.price ?? '') : '';
  const levelMap = !selected ? {} : selected.levels ? selected.levels : selected.dataQuality === 'demo' ? getDemoLevel(selected.symbol, selected.price || 100).levels : {};
  const readinessState = readiness(checks);
  const loading = source !== 'demo' && view.status === 'loading';
  const kpis = active === 'screener' ? buildKpis({ candidates, source, scan: view, watchCount: watchlist.length }) : null;

  return (
    <div className={`app-shell ${menuOpen ? 'menu-open' : ''}`}>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      {menuOpen && <button type="button" className="menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <aside className="sidebar" id="side-drawer" aria-label="Main navigation">
        <div className="brand"><Brand /></div>
        <div className="sidebar-menu" id="sidebar-menu">
          <p className="menu-heading">WORKSPACE</p>
          <nav className="flex flex-col gap-2" aria-label="Workspace">{pages.map(item => (
            <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} disabled={item.disabled} onClick={() => choosePage(item.id)} aria-current={active === item.id ? 'page' : undefined} aria-label={item.disabled ? `${item.label} — Coming Soon` : item.label} title={item.disabled ? `${item.label} — Coming Soon` : item.label}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="nav-label">{item.label}</span>{item.disabled && <span className="soon-badge">Coming Soon</span>}
            </button>
          ))}</nav>
        </div>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setPreference(dark ? 'light' : 'dark')} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}><span className="nav-icon" aria-hidden="true">{dark ? '☀' : '☾'}</span><span>{dark ? 'Light' : 'Dark'} mode</span></button>
          <button className="nav-item system-button" onClick={() => setPreference('system')} aria-pressed={preference === 'system'} aria-label="Use system theme" title="Use system theme"><span className="nav-icon" aria-hidden="true">▣</span><span>Use system theme{preference === 'system' ? ' ✓' : ''}</span></button>
          <div className="identity"><span className="avatar">TB</span><div><p>Personal workspace</p><span>Tradebuddy / v0.1</span></div></div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button type="button" className="menu-toggle" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-controls="side-drawer" aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? '×' : '☰'}</button>
          <div className="topbar-brand"><Brand /></div>
          <nav className="topnav" aria-label="Main">{pages.map(item => (
            <button key={item.id} className={`topnav-item ${active === item.id ? 'is-active' : ''}`} disabled={item.disabled} onClick={() => choosePage(item.id)} aria-current={active === item.id ? 'page' : undefined}>
              <span className="topnav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.disabled && <span className="topnav-soon">Soon</span>}
            </button>
          ))}</nav>
          <div className="breadcrumb"><span className="breadcrumb-parent">Workspace /</span><span>{page.label}</span></div>
          <div className="topbar-right">
            <StatusBar />
            <div className="topbar-theme">
              <button type="button" className="theme-button" onClick={() => setPreference(dark ? 'light' : 'dark')} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}>{dark ? '☀' : '☾'}</button>
              <button type="button" className="theme-button" onClick={() => setPreference('system')} aria-pressed={preference === 'system'} aria-label="Use system theme" title="Use system theme">▣</button>
            </div>
            <MarketClock />
          </div>
        </header>
        <main className="workspace" id="workspace" tabIndex={-1}>
          <section className={`page-hero ${kpis ? '' : 'is-simple'}`} aria-labelledby="page-title">
            <div className="hero-text">
              <p className="eyebrow">YOUR TRADING WORKSPACE</p>
              <h1 id="page-title">{page.label}</h1>
              <p className="page-description">{page.description}</p>
            </div>
            {kpis && (
              <div className="kpis">
                {kpis.map(kpi => (
                  <div key={kpi.id} className={`kpi ${kpi.tone ? `is-${kpi.tone}` : ''}`}>
                    <span className="kpi-label">{kpi.label}</span>
                    <span className="kpi-value">{kpi.value}</span>
                    <span className="kpi-sub">{kpi.sub}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {active === 'screener' && (
            <section className={`dashboard-row ${selected ? 'has-detail' : ''}`}>
              <div className="dashboard-card candidates">
                <MoverTicker candidates={candidates} />
                <SourceBar source={source} onSource={setSource} onRefresh={() => setReloadKey(key => key + 1)} loading={loading} />
                <MoverBoard
                  candidates={candidates}
                  selectedSymbol={selected ? selected.symbol : null}
                  watchedSymbols={watchedSymbols}
                  onSelect={setSelected}
                  onToggleWatch={handleToggleWatchlist}
                  notice={scanNotice(source, view)}
                  emptyText={emptyText(source, view)}
                />
              </div>
              {selected && (
                <>
                  <button type="button" className="sheet-backdrop" aria-label="Close details" onClick={() => setSelected(null)} />
                  <div className="detail-rail" key={selected.symbol}>
                    <SelectedStock mover={selected} onClose={() => setSelected(null)} />
                    <div className="dashboard-card"><RiskCalculator entry={entryPrice} stop={null} target={null} /></div>
                    <div className="dashboard-card"><h3 className="rail-title">Why this tier</h3><FactorList factors={selected.assessment.factors} /></div>
                    <div className="dashboard-card"><ChecklistPanel checks={checks} onChange={handleCheck} /></div>
                    <div className="dashboard-card"><KeyLevelPanel currentPrice={selected.price || 100} levels={levelMap} onChange={setLevels} /></div>
                  </div>
                </>
              )}
            </section>
          )}

          {active === 'watchlist' && (
            <section>
              <WatchlistManager watchlist={watchlist} onToggle={handleToggleWatchlist} />
              {watchlist.length > 0 && <p>Select symbols from the screener to monitor their setup state.</p>}
            </section>
          )}

          {active === 'settings' && (
            <section className="settings-grid">
              <ApiKeySettings />
              <div className="dashboard-card">
                <h3>Data import</h3>
                <CsvImporter />
                <p className="note">Demo data is synthetic and does not represent market data or trading advice.</p>
              </div>
            </section>
          )}

          <footer className="page-footer"><span>Tradebuddy</span><span>Readiness: {readinessState.met}/{readinessState.total}</span></footer>
        </main>
      </div>
    </div>
  );
}
