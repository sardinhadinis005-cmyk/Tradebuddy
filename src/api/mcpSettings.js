export async function mcpRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) } });
  } catch { throw new Error('Cannot reach Tradebuddy. Check your connection or sign in again.'); }
  let body;
  try { body = await response.json(); } catch { throw new Error('Expected JSON. Cloudflare may require a new browser sign-in.'); }
  if (!response.ok) throw new Error(body?.error && typeof body.error === 'string' ? body.error : `Request failed (${response.status}).`);
  return body;
}

export async function generateMcpToken() {
  const body = await mcpRequest('/api/mcp-token', { method: 'POST' });
  if (!/^tbm_[a-f0-9]{64}$/.test(body?.token || '') || !Number.isFinite(Date.parse(body?.expiresAt))) throw new Error('Unexpected token response. Do not retry repeatedly; check deployment.');
  return body;
}
export const revokeMcpToken = () => mcpRequest('/api/mcp-token', { method: 'DELETE' });
export async function testMcpToken(token) {
  if (!/^tbm_[a-f0-9]{64}$/.test(token)) throw new Error('Enter a valid Tradebuddy connector token.');
  const body = await mcpRequest('/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'settings-test', method: 'tools/list' }) });
  if (body.error || !Array.isArray(body.result?.tools)) throw new Error('MCP tool discovery failed.');
  const names = body.result.tools.map(t => t.name);
  if (!names.includes('save_trade_draft') || !names.includes('get_trade_draft')) throw new Error('The expected draft tools are missing.');
  return names;
}
