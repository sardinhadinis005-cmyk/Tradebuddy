export async function getSession() {
  const res = await fetch('/api/session');
  if (!res.ok) throw new Error(`Session unavailable: ${res.status}`);
  return res.json();
}

// Returns { session, feed, connected, timestamp }.
// Until a provider is configured, the server should respond with connected: false.
