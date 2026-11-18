import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createProposal } from '../src/features/tradeProposal.js';
import { proposalStore } from '../worker/proposalStore.js';
import { planningStore } from '../worker/planning.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const now = Date.parse('2026-11-18T19:00:00Z');
const request = '12345678-1234-4234-8234-123456789abc';
const proposal = '87654321-4321-4321-8432-210987654321';
const base = { environment: 'sandbox', accountId: 'SBX', symbol: 'AAPL', optionSymbol: 'AAPL260120C00100000', side: 'buy_to_open', quantity: 1, orderType: 'limit', limitPrice: 1.5, duration: 'day', expiresAt: new Date(now + 600000).toISOString(), thesis: 'Thesis', invalidation: 'Invalidation', planningRequestId: request };
function fixture() {
  const data = new Map();
  const env = { SETTINGS: { get: async k => data.get(k) ?? null, put: async (k, v) => { data.set(k, v); }, list: async ({ prefix, limit = 1000 }) => { const keys = [...data.keys()].filter(k => k.startsWith(prefix)).slice(0, limit).map(name => ({ name })); return { keys, list_complete: true }; } } };
  const scan = async () => ({ items: [{ symbol: 'AAPL', capturedAt: new Date(now).toISOString(), warnings: [] }], meta: {} });
  return { env, scan };
}
test('proposal requires a matching planning request and records its ID', async () => {
  const f = fixture();
  const planning = await planningStore(f.env, 'a@example.test', now, f.scan);
  await planning.create({ id: request, symbol: 'AAPL' });
  const store = await proposalStore(f.env, 'a@example.test', now);
  const created = await store.create({ ...base, id: proposal });
  assert.equal(created.planningRequestId, request);
  const read = await planning.get(request);
  assert.equal(read.linkedProposals.length, 1); assert.equal(read.linkedProposals[0].id, proposal);
  await assert.rejects(store.create({ ...base, id: '87654321-4321-4321-8432-210987654322', planningRequestId: '99999999-9999-4999-8999-999999999999' }));
  await assert.rejects(store.create({ ...base, id: '87654321-4321-4321-8432-210987654323', planningRequestId: 'not-a-uuid' }));
  await assert.rejects(createProposal({ ...base, symbol: 'MSFT' }, { id: proposal, now }));
});
