import { authenticate } from './access.js';
import { proposalStore } from './proposalStore.js';
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });

export async function handleProposalApi(request, env, deps = {}) {
  const url = new URL(request.url);
  const match = /^\/api\/proposals(?:\/([a-f0-9-]{36})(\/review)?)?$/.exec(url.pathname);
  if (!match && url.pathname !== '/api/proposals/queue') return json({ error: 'Not found' }, 404);
  const now = deps.now ?? new Date();
  const auth = await (deps.authenticate ?? authenticate)(request, env, { fetchImpl: deps.fetchImpl, nowMs: now.getTime() });
  if (auth.error) return json({ error: auth.error }, auth.status);
  const isQueue = url.pathname === '/api/proposals/queue';
  const id = match?.[1];
  const isReview = Boolean(match?.[2]);
  const methods = isQueue ? ['GET'] : isReview ? ['POST'] : id ? ['GET'] : ['GET', 'POST'];
  if (!methods.includes(request.method)) return json({ error: 'Method not allowed' }, 405, { Allow: methods.join(', ') });
  if (!env.SETTINGS) return json({ error: 'Account storage unavailable' }, 503);
  let body;
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Same-origin browser request required' }, 403);
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'Send JSON' }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Empty body' }, 400);
    const chunks = []; let size = 0;
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 16000) { await reader.cancel(); return json({ error: 'Request too large' }, 413); } chunks.push(part.value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Send an object' }, 400);
    const fields = isReview ? ['action', 'expectedVersion'] : ['environment', 'accountId', 'symbol', 'optionSymbol', 'side', 'quantity', 'orderType', 'limitPrice', 'duration', 'expiresAt', 'thesis', 'invalidation'];
    if (Object.keys(body).some(k => !fields.includes(k))) return json({ error: 'Unknown fields' }, 400);
  }
  try {
    const store = await (deps.store ?? proposalStore)(env, auth.email, now.getTime());
    if (request.method === 'GET') {
      const value = id ? await store.get(id) : await store.list({ cursor: url.searchParams.get('cursor') || undefined, queue: isQueue });
      return value === null ? json({ error: 'Not found' }, 404) : json(value);
    }
    const value = isReview ? await store.review(id, body) : await store.create(body);
    return value === null ? json({ error: 'Not found' }, 404) : json(value, isReview ? 200 : 201);
  } catch { return json({ error: 'Proposal operation failed. Check inputs, expiry and version. Conflicting review history requires reconciliation; no broker action was performed.' }, 409); }
}
