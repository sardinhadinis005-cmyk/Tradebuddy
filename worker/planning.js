import { authenticate } from './access.js';
import { userId } from './vault.js';
import { readOpportunities } from './opportunityService.js';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const warning = 'Sandbox research request only. Not order approval. Manual Perplexity handoff required; no automatic wake-up or duplicate-safe execution claiming. Saved market context must be refreshed before any proposal.';
const view = (record, now) => record && ({ ...record, status: Date.parse(record.expiresAt) <= now ? 'expired' : 'pending', warning, executable: false });
export async function planningStore(env, email, now = Date.now(), scan = readOpportunities) {
  if (!env.SETTINGS || typeof email !== 'string' || !email.trim()) throw new Error('Storage or identity unavailable');
  const prefix = `planning:v1:${await userId(email)}:`;
  const get = async id => {
    if (typeof id !== 'string' || !uuid.test(id)) throw new Error('Invalid request ID');
    const raw = await env.SETTINGS.get(prefix + id);
    return raw === null ? null : view(JSON.parse(raw), now);
  };
  return {
    get,
    async create(body) {
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['id', 'symbol'].includes(k))) throw new Error('Invalid fields');
      if (typeof body.id !== 'string' || !uuid.test(body.id) || typeof body.symbol !== 'string' || !/^[A-Z]{1,5}([.-][A-Z])?$/.test(body.symbol)) throw new Error('Invalid inputs');
      const previous = await get(body.id);
      if (previous) {
        if (previous.symbol !== body.symbol) throw new Error('Request ID mismatch');
        return previous;
      }
      const result = await scan(env, email, { mode: 'live', now: new Date(now) });
      const snapshot = result.items.find(item => item.symbol === body.symbol);
      if (!snapshot) throw new Error('Symbol no longer qualifies in the live scan');
      const record = { schemaVersion: 1, id: body.id, symbol: body.symbol, environment: 'sandbox', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 900000).toISOString(), snapshot, scanMeta: result.meta, researchOnly: true, executable: false };
      const encoded = JSON.stringify(record);
      if (new TextEncoder().encode(encoded).length > 100000) throw new Error('Snapshot too large');
      await env.SETTINGS.put(prefix + body.id, encoded);
      return view(record, now);
    },
    async list(cursor) {
      if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 2048)) throw new Error('Invalid cursor');
      const page = await env.SETTINGS.list({ prefix, limit: 20, ...(cursor ? { cursor } : {}) });
      const items = await Promise.all(page.keys.map(key => get(key.name.slice(prefix.length))));
      return { items: items.filter(Boolean), nextCursor: page.list_complete ? null : page.cursor, warning, executable: false, ordering: 'Request ID, not creation time. Expired records are retained; pending does not mean claimed or unprocessed.' };
    },
  };
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function handlePlanningApi(request, env, deps = {}) {
  const url = new URL(request.url);
  const match = /^\/api\/planning-requests(?:\/([a-f0-9-]{36}))?$/.exec(url.pathname);
  if (!match) return json({ error: 'Not found' }, 404);
  const auth = await (deps.authenticate || authenticate)(request, env);
  if (auth.error) return json({ error: auth.error }, auth.status);
  if (!['GET', 'POST'].includes(request.method) || (match[1] && request.method !== 'GET')) return json({ error: 'Method not allowed' }, 405);
  try {
    const store = await planningStore(env, auth.email, deps.now ?? Date.now(), deps.scan);
    if (request.method === 'GET') {
      const value = match[1] ? await store.get(match[1]) : await store.list(url.searchParams.get('cursor') || undefined);
      return value === null ? json({ error: 'Not found' }, 404) : json(value);
    }
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Same-origin browser request required' }, 403);
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'Send JSON' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Empty body' }, 400);
    const chunks = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); return json({ error: 'Request too large' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return json(await store.create(JSON.parse(new TextDecoder().decode(bytes))), 201);
  } catch { return json({ error: 'Planning request failed. Check authentication, storage and whether the symbol still qualifies in the live scan. Retry with the same request ID if the result is uncertain. No order was submitted.' }, 409); }
}
export const planningTools = [
  { name: 'list_planning_requests', description: 'Read your saved sandbox planning requests, including expired records. Pending means within its 15-minute lifetime, not unprocessed. Paginate to discover all requests; KV listing may lag. No execution authorization.', inputSchema: { type: 'object', properties: { cursor: { type: 'string', maxLength: 2048 } }, additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_planning_request', description: 'Read your saved planning request and immutable-at-application-level snapshot. Check expiry and refresh market/account/options data before drafting. Does not claim, complete, approve or execute a trade.', inputSchema: { type: 'object', properties: { id: { type: 'string', maxLength: 36 } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
];
export async function callPlanningTool(name, args, env, email) {
  const tool = planningTools.find(t => t.name === name);
  if (!tool || !args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(k => !Object.hasOwn(tool.inputSchema.properties, k))) throw new Error('Invalid arguments');
  const store = await planningStore(env, email);
  return name === 'get_planning_request' ? store.get(args.id) : store.list(args.cursor);
}
