# MCP machine authentication

The Worker accepts an application bearer token at `/mcp`. Ordinary `/api/` endpoints still use browser Access authentication. No order tools are exposed.

## Credential management

From a signed-in same-origin browser, POST `/api/mcp-token` with no body to create/rotate a token. The JSON response contains `token`, `expiresAt`, and `scope`. Display or copy the token securely; its plaintext is returned only on creation. Never paste it in chat or commit it. DELETE the same endpoint to revoke. Both requests require the browser's Access session and an Origin matching the Worker address; Authorization headers are rejected on management requests.

The Settings interface is not wired yet. This commit creates no token automatically.

Tokens are 32 random bytes, prefixed `tbm_`, expire after 30 days, and are stored only as SHA-256 hashes linked to the owner. Configure the connector to send `Authorization: Bearer <token>` only to `/mcp`. Drafts belong to the mapped owner, not an email supplied by the caller. Current scope is `mcp:drafts`, limited to the two existing draft tools; reassess scope enforcement before exposing more tools.

## Cloudflare Access

An application bearer token does not pass an interactive Access login at the edge. No Access policy is modified by this commit. Before connecting Perplexity, verify a supported machine-to-machine edge configuration and the connector's header support. Keep normal browser protection enabled. Do not expose the whole application with a bypass rule. Service-token identities alone do not have a user email: application bearer tokens provide the per-user identity.

## Limits

KV replication is eventually consistent: rotations/revocations are not immediately global. Do not rotate concurrently; management writes are not transactional and simultaneous rotations may leave more than one credential valid until expiry. This implementation is for research drafts only, not order authorization. For stricter credential lifecycle guarantees, use strongly consistent storage before enabling trading.

Local authentication tests mock Access and KV. Real deployment and Perplexity connectivity remain unverified. Optional Perplexity API automation is not enabled here.
