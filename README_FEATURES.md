# Tradebuddy features

This increment adds the dashboard, watchlist, setup checklist, risk planner, key-level planner, CSV importer, and API route scaffolding. It is intentionally read-only and does not place orders.

## What works immediately

- Compact candidate table with symbol, gap %, bias, setup state, volume, spread, and data quality.
- Watchlist with bias annotations.
- Setup checklist with manual condition states.
- Key-level planner for previous-day high/low, support, resistance, whole-dollar zones, and moving averages.
- Risk calculator with planned risk, slippage allowance, share sizing, position value, and reward/risk.
- CSV importer for historical candle analysis when a market-data provider is not available.
- Session/feed status bar with explicit connected, stale, and not-connected states.
- Provider adapter and Worker API scaffolding for a future live data feed.

## What is intentionally not included

- Live prices, quotes, or bars without a configured provider.
- Provider credentials in the frontend or committed configuration.
- Order execution or broker integration.
- Level 2 order book depth.
- Automatic buy/sell signals.

## Provider guidance

Alpaca documents a `GET /v2/stocks/snapshots` endpoint returning the latest trade, latest quote, minute bar, daily bar, and previous daily bar for requested symbols. Its default feed is IEX for basic accounts and SIP for unlimited subscriptions; those are not equivalent measurements. [web:22]

Before wiring a live provider, confirm:

- Which feed you are entitled to.
- Whether the feed covers the symbols and sessions you need.
- Whether timestamps and freshness are exposed.
- Whether the subscription permits displaying data in your application.

## Risk disclosures

The checklist thresholds and reward/risk display are proposed interpretations of the trading transcripts, not validated strategies. Planned risk is not a guaranteed maximum loss. Slippage, gaps, and execution quality can increase actual loss. This dashboard does not constitute trading advice.
