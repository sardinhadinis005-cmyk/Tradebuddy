import { userId } from './vault.js';
import { createProposal, reviewProposal, proposalStatus, queuedProposal } from '../src/features/tradeProposal.js';

export async function proposalStore(env, email, now = Date.now()) {
  if (!env.SETTINGS) throw new Error('Storage unavailable');
  const owner = await userId(email);
  const prefix = `proposal:${owner}:`;
  const valid = id => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
  async function get(id) {
    if (!valid(id)) throw new Error('Invalid proposal id');
    const raw = await env.SETTINGS.get(prefix + id);
    if (!raw) return null;
    let record = JSON.parse(raw);
    const decisions = await env.SETTINGS.list({ prefix: `proposal-review:${owner}:${id}:`, limit: 1000 });
    if (!decisions.list_complete) throw new Error('Review history requires reconciliation');
    const events = (await Promise.all(decisions.keys.map(k => env.SETTINGS.get(k.name)))).filter(Boolean).map(JSON.parse);
    events.sort((a, b) => a.at - b.at || a.eventId.localeCompare(b.eventId));
    for (const event of events) {
      record = reviewProposal(record, { action: event.action, expectedVersion: event.expectedVersion, actor: email, now: event.at });
    }
    return { ...record, status: proposalStatus(record, now) };
  }
  return {
    async create(input) {
      const record = createProposal(input, { id: crypto.randomUUID(), now });
      const request = await env.SETTINGS.get(`planning:v1:${owner}:${input.planningRequestId}`);
      if (!request) throw new Error('Planning request not found');
      const parsed = JSON.parse(request);
      if (parsed.symbol !== record.terms.symbol || parsed.environment !== 'sandbox') throw new Error('Planning request does not match proposal');
      await env.SETTINGS.put(prefix + record.id, JSON.stringify(record));
      return record;
    },
    get,
    async list({ cursor, queue = false } = {}) {
      const page = await env.SETTINGS.list({ prefix, limit: 50, ...(cursor ? { cursor } : {}) });
      const records = (await Promise.all(page.keys.map(k => get(k.name.slice(prefix.length))))).filter(Boolean);
      return { items: queue ? records.map(r => queuedProposal(r, now)).filter(Boolean) : records, cursor: page.list_complete ? null : page.cursor, consistency: 'eventual', submissionClaimSupported: false };
    },
    async review(id, input) {
      const record = await get(id);
      if (!record) return null;
      const result = reviewProposal(record, { action: input.action, expectedVersion: input.expectedVersion, actor: email, now });
      const eventId = crypto.randomUUID();
      await env.SETTINGS.put(`proposal-review:${owner}:${id}:${eventId}`, JSON.stringify({ eventId, at: now, action: input.action, expectedVersion: input.expectedVersion }));
      return { ...result, consistency: 'eventual', submissionClaimSupported: false };
    },
  };
}
