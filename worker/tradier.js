export class TradierError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'TradierError';
    this.status = status;
  }
}

// Tradier returns a bare object instead of a one-item array, and null when there is nothing.
export const toArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

export function createTradier(env, fetchImpl = (...args) => fetch(...args)) {
  const base = (env.TRADIER_BASE_URL || 'https://sandbox.tradier.com').replace(/\/+$/, '');
  const token = env.TRADIER_TOKEN;

  async function call(path, { method = 'GET', params, form } = {}) {
    const url = new URL(`${base}/v1${path}`);
    if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const init = { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
    if (form) {
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(form).toString();
    }
    const res = await fetchImpl(url.toString(), init);
    if (!res.ok) {
      const raw = (await res.text().catch(() => '')).slice(0, 200);
      const text = token ? raw.split(token).join('[hidden]') : raw;
      throw new TradierError(res.status, `Tradier ${path} returned ${res.status}${text ? `: ${text}` : ''}`);
    }
    return res.json();
  }

  return {
    base,
    isSandbox: base.includes('sandbox'),

    async quotes(symbols) {
      const chunks = [];
      for (let i = 0; i < symbols.length; i += 100) chunks.push(symbols.slice(i, i + 100));
      const results = await Promise.all(
        chunks.map((chunk) => call('/markets/quotes', { method: 'POST', form: { symbols: chunk.join(',') } })),
      );
      return {
        quotes: results.flatMap((r) => toArray(r?.quotes?.quote)),
        unmatched: results.flatMap((r) => toArray(r?.quotes?.unmatched_symbols?.symbol)),
        requests: chunks.length,
      };
    },

    async history(symbol, start, end) {
      const data = await call('/markets/history', { params: { symbol, interval: 'daily', start, end } });
      return toArray(data?.history?.day);
    },

    async timesales(symbol, startDate, endDate) {
      const data = await call('/markets/timesales', {
        params: { symbol, interval: '15min', start: `${startDate} 09:30`, end: `${endDate} 16:00`, session_filter: 'open' },
      });
      return toArray(data?.series?.data);
    },
  };
}
