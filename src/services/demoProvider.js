const symbols = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMD'];

function makeCandidate(symbol) {
  const bias = Math.random() > 0.5 ? 'bullish' : 'bearish';
  return {
    symbol,
    gapPercent: (Math.random() * 10 - 5).toFixed(2),
    bias,
    setupStatus: 'Watching',
    volume: Math.floor(Math.random() * 20000000) + 1000000,
    spread: Math.random() * 0.1,
    dataQuality: 'demo',
    updated: new Date().toISOString(),
  };
}

export function getDemoCandidates() {
  return symbols.map(makeCandidate);
}

export function getDemoLevel(symbol, price) {
  return {
    symbol,
    currentPrice: price || 100,
    levels: {
      'Previous day high': price * 0.98,
      'Previous day low': price * 0.95,
      '20 SMA': price * 0.97,
      '200 SMA': price * 0.90,
    },
  };
}

// Demo data is synthetic and does not represent market data or trading advice.
