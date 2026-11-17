import { userId } from './vault.js';

export async function draftStore(env, email) {
  if (!env.SETTINGS) throw new Error('Storage unavailable');
  const prefix = `draft:${await userId(email)}:`;
  const validId = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
  return {
    async save(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid draft');
      const text = (key, max) => {
        if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max) throw new Error(`Invalid ${key}`);
        return input[key].trim();
      };
      const symbol = text('symbol', 10).toUpperCase();
      if (!/^[A-Z]{1,5}([.-][A-Z])?$/.test(symbol)) throw new Error('Invalid symbol');
      const thesis = text('thesis', 4000);
      const invalidation = text('invalidation', 2000);
      const now = Date.now();
      const record = { id: crypto.randomUUID(), symbol, thesis, invalidation, status: 'pending', executable: false,
        source: 'mcp', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 900000).toISOString() };
      await env.SETTINGS.put(prefix + record.id, JSON.stringify(record), { expirationTtl: 604800 });
      return record;
    },
    async get(id) {
      if (!validId(id)) throw new Error('Invalid draft id');
      const raw = await env.SETTINGS.get(prefix + id);
      if (!raw) return null;
      const record = JSON.parse(raw);
      return { ...record, status: Date.parse(record.expiresAt) <= Date.now() ? 'expired' : 'pending', executable: false };
    },
  };
}
