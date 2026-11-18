async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (!(response.headers.get('Content-Type') || '').includes('application/json')) throw new Error('Account session unavailable. Reload and sign in again.');
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Proposal request failed');
  return body;
}
export const listProposals = (cursor, signal) => request(`/api/proposals${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { signal });
export const submitProposalReview = (id, action, expectedVersion) => request(`/api/proposals/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ action, expectedVersion }) });
