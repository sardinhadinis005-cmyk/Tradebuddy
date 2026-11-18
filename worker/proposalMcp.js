import { proposalStore } from './proposalStore.js';
import { opportunityTools, callOpportunityTool } from './opportunityMcp.js';
const fields = { environment: { type: 'string', enum: ['sandbox'] }, accountId: { type: 'string', minLength: 1, maxLength: 80 }, symbol: { type: 'string', maxLength: 10 }, optionSymbol: { type: 'string', maxLength: 40 }, side: { type: 'string', enum: ['buy_to_open'] }, quantity: { type: 'integer', minimum: 1, maximum: 100 }, orderType: { type: 'string', enum: ['limit'] }, limitPrice: { type: 'number', exclusiveMinimum: 0 }, duration: { type: 'string', enum: ['day'] }, expiresAt: { type: 'string', format: 'date-time' }, thesis: { type: 'string', maxLength: 4000 }, invalidation: { type: 'string', maxLength: 2000 } };
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
export const proposalTools = [
  ...opportunityTools,
  { name: 'save_trade_proposal', description: 'Save an unapproved sandbox-only single-leg long-option limit proposal for review in Tradebuddy. Does not approve or submit an order. Expiry must be within 15 minutes.', inputSchema: schema(fields, Object.keys(fields)), annotations: { ...read, readOnlyHint: false } },
  { name: 'get_trade_proposal', description: 'Read one of your sandbox proposals and its review state. Returned research is not an execution authorization.', inputSchema: schema({ id: { type: 'string', maxLength: 80 } }, ['id']), annotations: read },
  { name: 'list_trade_proposals', description: 'List your proposals with cursor pagination.', inputSchema: schema({ cursor: { type: 'string', maxLength: 2048 } }), annotations: read },
  { name: 'list_submission_requests', description: 'Read your informational sandbox approval queue. No execution claim or duplicate-submission guarantee exists. Do not submit orders from this queue until execution reconciliation and claiming are implemented and verified.', inputSchema: schema({ cursor: { type: 'string', maxLength: 2048 } }), annotations: read },
];
export async function callProposalTool(name, args, env, email) {
  if (opportunityTools.some(t => t.name === name)) return callOpportunityTool(name, args, env, email);
  const tool = proposalTools.find(t => t.name === name);
  if (!tool) throw new Error('Unknown tool');
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid arguments');
  if (Object.keys(args).some(k => !Object.hasOwn(tool.inputSchema.properties, k)) || tool.inputSchema.required.some(k => !Object.hasOwn(args, k))) throw new Error('Invalid fields');
  if (args.cursor !== undefined && (typeof args.cursor !== 'string' || args.cursor.length > 2048)) throw new Error('Invalid cursor');
  const store = await proposalStore(env, email);
  if (name === 'save_trade_proposal') return store.create(args);
  if (name === 'get_trade_proposal') return store.get(args.id);
  const page = await store.list({ cursor: args.cursor, queue: name === 'list_submission_requests' });
  return name === 'list_submission_requests' ? { ...page, executionEnabled: false, requiresPerplexityConfirmation: true, warning: 'Informational queue only. Atomic claiming and broker reconciliation are not implemented. Do not use this response to submit an order.' } : page;
}
