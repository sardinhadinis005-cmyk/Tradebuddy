import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { planningStore, handlePlanningApi, callPlanningTool } from '../worker/planning.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const id = '12345678-1234-4234-8234-123456789abc';
const now = Date.parse('2026-11-18T19:00:00Z');
function fixture() {
  const data = new Map(); let scans = 0;
  const env = { SETTINGS: { get: async k => data.get(k) ?? null, put: async (k, v) => { data.set(k, v); }, list: async ({ prefix }) => ({ keys: [...data.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const scan = async () => { scans++; return { items: [{ symbol: 'AAPL', capturedAt: new Date(now).toISOString(), warnings: [], executable: false }], meta: { researchOnly: true } }; };
  return { env, scan, scans: () => scans };
}
test('request is saved, retry reuses stored snapshot and users are isolated', async () => {
  const f = fixture(); const store = await planningStore(f.env, 'a@example.test', now, f.scan);
  const first = await store.create({ id, symbol: 'AAPL' });
  assert.equal(first.status, 'pending'); assert.equal(first.environment, 'sandbox'); assert.equal(first.executable, false);
  assert.deepEqual(await store.create({ id, symbol: 'AAPL' }), first); assert.equal(f.scans(), 1);
  assert.equal(await (await planningStore(f.env, 'b@example.test', now, f.scan)).get(id), null);
  assert.equal((await store.list()).items.length, 1);
  assert.equal((await (await planningStore(f.env, 'a@example.test', now + 900000, f.scan)).get(id)).status, 'expired');
});
test('rejects arbitrary snapshots, unknown fields, invalid IDs and absent candidates', async () => {
  const f = fixture(); const store = await planningStore(f.env, 'a@example.test', now, f.scan);
  await assert.rejects(store.create({ id, symbol: 'AAPL', snapshot: {} }));
  await assert.rejects(store.create({ id: '../other', symbol: 'AAPL' }));
  await assert.rejects(store.create({ id, symbol: 'MSFT' }));
  await assert.rejects(callPlanningTool('get_planning_request', { id, approve: true }, f.env, 'a@example.test'));
});
test('browser writes require same origin and API respects authentication', async () => {
  const f = fixture();
  const request = new Request('https://trade.test/api/planning-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' }, body: JSON.stringify({ id, symbol: 'AAPL' }) });
  const response = await handlePlanningApi(request, f.env, { authenticate: async () => ({ email: 'a@example.test' }), now, scan: f.scan });
  assert.equal(response.status, 403); assert.equal(f.scans(), 0);
  const denied = await handlePlanningApi(new Request('https://trade.test/api/planning-requests'), f.env, { authenticate: async () => ({ error: 'Denied', status: 401 }) });
  assert.equal(denied.status, 401);
});
