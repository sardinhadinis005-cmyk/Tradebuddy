const ACTIONS = new Set(['reject', 'approve_later', 'approve_send']);
const fail = message => { throw new Error(message); };
const text = (value, max) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : fail('Invalid text');

// Initial execution workflow is sandbox-only and single-leg long options.
export function createProposal(input, { id, now = Date.now() } = {}) {
  if (!input || input.environment !== 'sandbox') fail('Live proposals are disabled');
  if (!Number.isFinite(now)) fail('Invalid clock');
  const accountId = text(input.accountId, 80);
  const symbol = text(input.symbol, 10).toUpperCase();
  const optionSymbol = text(input.optionSymbol, 40).toUpperCase();
  if (!/^[A-Z]{1,5}([.-][A-Z])?$/.test(symbol)) fail('Invalid underlying');
  if (!new RegExp(`^${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[0-9]{6}[CP][0-9]{8}$`).test(optionSymbol)) fail('Invalid option contract');
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 100) fail('Invalid quantity');
  if (typeof input.limitPrice !== 'number' || !Number.isFinite(input.limitPrice) || input.limitPrice <= 0) fail('Invalid limit price');
  const cents = Math.round(input.limitPrice * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(input.limitPrice * 100 - cents) > 0.000001) fail('Price must use whole cents');
  if (input.side !== 'buy_to_open' || input.orderType !== 'limit' || input.duration !== 'day') fail('Unsupported order terms');
  const expires = Date.parse(input.expiresAt);
  if (!Number.isFinite(expires) || expires <= now || expires > now + 900000) fail('Expiry must be within 15 minutes');
  const proposalId = text(id, 80);
  return { schemaVersion: 1, id: proposalId, version: 1, status: 'pending_review',
    createdAt: new Date(now).toISOString(), expiresAt: new Date(expires).toISOString(),
    thesis: text(input.thesis, 4000), invalidation: text(input.invalidation, 2000),
    terms: { environment: 'sandbox', accountId, symbol, optionSymbol, side: 'buy_to_open', quantity: input.quantity, orderType: 'limit', limitPrice: cents / 100, duration: 'day' },
    approval: null, brokerOrderId: null, brokerSubmitted: false,
  };
}

export function proposalStatus(record, now = Date.now()) {
  if (!Number.isFinite(now) || !Number.isFinite(Date.parse(record.expiresAt))) fail('Invalid expiry');
  return ['pending_review', 'approved', 'awaiting_perplexity_submission'].includes(record.status) && Date.parse(record.expiresAt) <= now ? 'expired' : record.status;
}

export function reviewProposal(record, { action, expectedVersion, actor, now = Date.now() }) {
  if (!ACTIONS.has(action)) fail('Invalid review action');
  if (expectedVersion !== record.version) fail('Proposal version changed; review again');
  const status = proposalStatus(record, now);
  if (!['pending_review', 'approved'].includes(status)) fail('Proposal is not reviewable');
  const reviewer = text(actor, 254);
  const approved = action !== 'reject';
  return { ...record, status: action === 'reject' ? 'rejected' : action === 'approve_send' ? 'awaiting_perplexity_submission' : 'approved',
    approval: approved ? { actor: reviewer, at: new Date(now).toISOString(), proposalVersion: record.version, terms: { ...record.terms }, submissionRequested: action === 'approve_send' } : null,
    reviewedAt: new Date(now).toISOString(), brokerSubmitted: false, brokerOrderId: null,
  };
}

export function queuedProposal(record, now = Date.now()) {
  if (proposalStatus(record, now) !== 'awaiting_perplexity_submission') return null;
  if (!record.approval?.submissionRequested || record.approval.proposalVersion !== record.version) fail('Approval mismatch');
  if (JSON.stringify(record.approval.terms) !== JSON.stringify(record.terms)) fail('Approved order terms changed');
  if (record.terms.environment !== 'sandbox' || record.brokerSubmitted || record.brokerOrderId) fail('Not eligible for submission request');
  return { ...record, requiresPerplexityConfirmation: true, executionAuthorizedByThisFunction: false };
}
