# Account setup

Tradebuddy uses Cloudflare Access (email one-time PIN) to sign people in. The Worker re-checks the signed token Access adds to every request, then stores each person's Tradier key encrypted.

## 1. Create the Access application
1. Cloudflare dashboard, Zero Trust, Settings, Authentication: make sure **One-time PIN** is enabled.
2. Access, Applications, Add an application, **Self-hosted**.
3. Application domain: your Worker address (for example `tradebuddy.<your-subdomain>.workers.dev`).
4. Add a policy: action **Allow**, include **Emails** and list the addresses that may sign in.
5. Save. Copy the **Application Audience (AUD) tag** from the application's overview.
6. Your team domain is `https://<team-name>.cloudflareaccess.com` (Zero Trust, Settings, Custom pages shows the team name).

## 2. Add three Worker secrets
Workers, tradebuddy, Settings, Variables and Secrets. Add each as type **Secret**:

| Name | Value |
|---|---|
| `TEAM_DOMAIN` | `https://<team-name>.cloudflareaccess.com` |
| `POLICY_AUD` | the AUD tag from step 1 |
| `SETTINGS_SECRET` | a long random string, 32 characters or more |

Keep a copy of `SETTINGS_SECRET`. If it is lost or changed, saved Tradier keys cannot be decrypted and each person must paste their key again.

## 3. Deploy and check
- Wrangler creates the `SETTINGS` KV namespace on deploy. If the deploy fails with a KV permission error, create a namespace in the dashboard and add its `id` under `[[kv_namespaces]]` in `wrangler.toml`.
- Open the site in a private window. You should be asked for your email, then a PIN.
- Settings shows who is signed in. Paste your Tradier key and choose Save and test.

## Notes
- Preview URLs on `workers.dev` that are not covered by the Access application still cannot read data: the Worker rejects any request without a valid Access token.
- `ALLOW_SHARED_TOKEN=true` with a `TRADIER_TOKEN` secret lets every signed-in user fall back to one shared key. Leave it unset unless you want that.
