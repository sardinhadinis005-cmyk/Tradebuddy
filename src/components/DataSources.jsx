import './account.css';

export default function DataSources() {
  return (
    <section className="dashboard-card settings-wide" aria-labelledby="sources-title">
      <h3 id="sources-title">Data sources</h3>
      <p className="settings-note">
        Tradebuddy ranks movers from prices, volume and price history, so it needs a market data provider. Each person adds their own key, and it is only ever used for their own account.
      </p>
      <div className="source-list">
        <article className="source-card">
          <h4>Tradier <span className="source-tag is-live">Supported</span></h4>
          <p><b>Why it is needed:</b> quotes and volume to find gaps, daily history for the 9 EMA and 20 SMA, and intraday bars for the hourly view.</p>
          <p><b>Sandbox keys</b> return data delayed about 15 minutes. <b>Production keys</b> can be real-time or delayed depending on the account, so Tradebuddy checks how recently very liquid stocks traded and only shows a delayed tag when the data is delayed.</p>
          <p>If that check cannot decide, for example when the market is closed, it says the delay is unverified rather than guessing.</p>
        </article>
        <article className="source-card">
          <h4>Interactive Brokers <span className="source-tag">Planned</span></h4>
          <p><b>Why it could help:</b> a second source of quotes and history, useful if you already trade there.</p>
          <p><b>What it needs:</b> real-time data through the API requires market data subscriptions, and data on the API counts as off-platform, so it can differ from what you see for free inside TWS.</p>
          <p><b>Why it is not connected yet:</b> the TWS API normally talks to TWS or IB Gateway running on your own computer, which a hosted Worker cannot reach. A bridge, or the Web API with its own login session, would be needed first.</p>
        </article>
      </div>
    </section>
  );
}
