// The "(delayed)" tag appears only when the data is known to be delayed.
export function liveLabel({ account, scan }) {
  const meta = scan && scan.status === 'ready' ? scan.meta : null;
  if (meta && meta.configured) return meta.timing === 'delayed' ? 'Live (delayed)' : 'Live';
  const tradier = account && account.tradier;
  return tradier && tradier.configured && tradier.environment === 'sandbox' ? 'Live (delayed)' : 'Live';
}
