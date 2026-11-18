import { readOpportunities } from './opportunityService.js';
const mode = { type: 'string', enum: ['live', 'review'], default: 'live' };
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };
export const opportunityTools = [
  { name: 'list_opportunities', description: 'Read qualifying opportunities from your configured Tradier screener universe. Includes source, timestamps, data-quality warnings and ranking. Not a whole-market search or an order recommendation. May request market data.', inputSchema: { type: 'object', properties: { mode, limit: { type: 'integer', minimum: 1, maximum: 20 } }, additionalProperties: false }, annotations },
  { name: 'get_setup_snapshot', description: 'Read research context for a qualifying symbol in your current configured scan, including assessment, levels, retracement and feed timing. Returns not_found if absent; does not scan an arbitrary symbol independently. A new scan may differ from an earlier list.', inputSchema: { type: 'object', properties: { symbol: { type: 'string', maxLength: 10 }, mode }, required: ['symbol'], additionalProperties: false }, annotations },
];
export async function callOpportunityTool(name, args, env, email) {
  const tool = opportunityTools.find(t => t.name === name);
  if (!tool || !args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid tool arguments');
  if (Object.keys(args).some(k => !Object.hasOwn(tool.inputSchema.properties, k))) throw new Error('Unknown fields');
  const selectedMode = args.mode === undefined ? 'live' : args.mode;
  if (!['live', 'review'].includes(selectedMode)) throw new Error('Invalid mode');
  let symbol;
  if (name === 'get_setup_snapshot') {
    if (typeof args.symbol !== 'string' || !/^[A-Z]{1,5}([.-][A-Z])?$/.test(args.symbol.trim().toUpperCase())) throw new Error('Invalid symbol');
    symbol = args.symbol.trim().toUpperCase();
  }
  const limit = args.limit === undefined ? 20 : args.limit;
  if (name === 'list_opportunities' && (!Number.isInteger(limit) || limit < 1 || limit > 20)) throw new Error('Invalid limit');
  const result = await readOpportunities(env, email, { mode: selectedMode });
  if (name === 'get_setup_snapshot') {
    const snapshot = result.items.find(item => item.symbol === symbol);
    return { status: snapshot ? 'found' : 'not_found', snapshot: snapshot || null, meta: result.meta };
  }
  return { items: result.items.slice(0, limit), totalQualifying: result.items.length, meta: result.meta };
}
