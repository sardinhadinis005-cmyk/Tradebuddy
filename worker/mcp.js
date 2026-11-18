import { authenticate } from './machineAuth.js';
import { draftStore } from './draftStore.js';
import { proposalTools, callProposalTool } from './proposalMcp.js';

const tools = [
  { name: 'save_trade_draft', description: 'Save unverified research for human review. No order is approved or submitted.',
    inputSchema: { type: 'object', properties: { symbol: { type: 'string' }, thesis: { type: 'string' }, invalidation: { type: 'string' } }, required: ['symbol', 'thesis', 'invalidation'], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'get_trade_draft', description: 'Read one of your saved research drafts.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  ...proposalTools,
];

export async function handleMcp(request, env) {
  const reply = (value, status = 200) => new Response(value === null ? null : JSON.stringify(value), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  const auth = await authenticate(request, env);
  if (auth.error) return reply({ error: auth.error }, auth.status);
  if (!env.SETTINGS) return reply({ error: 'Account storage is not set up.' }, 503);
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const origin = request.headers.get('Origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return reply({ error: 'Cross-site request rejected' }, 403);
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return reply({ error: 'Send JSON' }, 415);
  let message;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Empty');
    const chunks = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 24000) { await reader.cancel(); return reply({ error: 'Request too large' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    message = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return reply({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  const error = (code, text) => reply({ jsonrpc: '2.0', id: message?.id ?? null, error: { code, message: text } });
  if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || (message.id !== undefined && typeof message.id !== 'string' && typeof message.id !== 'number')) return error(-32600, 'Invalid request');
  if (message.id === undefined) return reply(null, 202);
  let result;
  if (message.method === 'initialize') result = { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'tradebuddy', version: '0.2.0' } };
  else if (message.method === 'ping') result = {};
  else if (message.method === 'tools/list') result = { tools };
  else if (message.method === 'tools/call') {
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    if (!tools.some(t => t.name === name)) return error(-32602, 'Unknown tool');
    try {
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid arguments');
      let value;
      if (proposalTools.some(t => t.name === name)) {
        value = await callProposalTool(name, args, env, auth.email);
      } else {
        const allowed = name === 'save_trade_draft' ? ['symbol', 'thesis', 'invalidation'] : ['id'];
        if (Object.keys(args).some(k => !allowed.includes(k))) throw new Error('Unknown fields');
        const store = await draftStore(env, auth.email);
        value = name === 'save_trade_draft' ? await store.save(args) : await store.get(args.id);
      }
      result = { content: [{ type: 'text', text: JSON.stringify(value) }] };
    } catch { result = { isError: true, content: [{ type: 'text', text: 'Operation failed. Check inputs, sandbox environment, expiry, review history and storage availability. No broker action was performed.' }] }; }
  } else return error(-32601, 'Method not found');
  return reply({ jsonrpc: '2.0', id: message.id, result });
}
