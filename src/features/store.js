export const defaultState = {
  candidates: [],
  selected: null,
  watchlist: [],
  checks: {
    trend: 'unknown',
    pullback: 'unknown',
    pullbackDepth: 'unknown',
    maProximity: 'unknown',
    entryCandle: 'unknown',
    keyLevel: 'unknown',
    targetRoom: 'unknown',
    riskPlan: 'unknown',
  },
  levels: {},
  session: {
    session: 'unknown',
    feed: '—',
    connected: false,
    timestamp: null,
    stale: false,
  },
};

// Central state shape. The live provider will replace candidates and session data when configured.
