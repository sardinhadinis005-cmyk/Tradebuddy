import { handleApi } from './api.js';
import { handleMcp } from './mcp.js';
import { manageMcpToken } from './machineAuth.js';
import { handleProposalApi } from './proposalApi.js';
import { handlePlanningApi } from './planning.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/mcp') return handleMcp(request, env);
    if (pathname === '/api/mcp-token') return manageMcpToken(request, env);
    if (pathname === '/api/planning-requests' || pathname.startsWith('/api/planning-requests/')) return handlePlanningApi(request, env);
    if (pathname === '/api/proposals' || pathname.startsWith('/api/proposals/')) return handleProposalApi(request, env);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
