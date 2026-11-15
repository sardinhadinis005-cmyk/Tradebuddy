export class ProviderAdapter {
  constructor({ baseUrl = '', headers = {} } = {}) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  async get(path, init = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers, ...init });
    if (!res.ok) throw new Error(`Provider request failed: ${res.status}`);
    return res.json();
  }

  async getSession() {
    return this.get('/api/session');
  }

  async getCandidates() {
    return this.get('/api/candidates');
  }

  async getBars(symbol, options = {}) {
    return this.get(`/api/stocks/${encodeURIComponent(symbol)}/bars`, { ...options });
  }

  // Implement provider-specific mapping when a feed is configured.
}

// Do not commit provider credentials here. Supply them through environment variables only.
