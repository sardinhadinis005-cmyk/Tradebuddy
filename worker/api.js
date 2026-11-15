export function handleApi(request) {
  const url = new URL(request.url);
  if (url.pathname === '/api/session') {
    return Response.json({
      session: 'unknown',
      feed: 'none',
      connected: false,
      timestamp: new Date().toISOString(),
    });
  }
  if (url.pathname === '/api/candidates') {
    return Response.json([]);
  }
  return new Response(null, { status: 404 });
}

// Until a provider is configured, all market-data routes return empty or not-connected responses.
