import { handleApi } from './api.js';
import { handleMcp } from './mcp.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/mcp') return handleMcp(request, env);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
