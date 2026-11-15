# Tradebuddy

Starter dashboard using React, Vite, Tailwind CSS v4, and Cloudflare Workers Static Assets.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

## Build and check

```sh
npm run build
npm run preview
npm run check:worker
```

## Deploy

```sh
npx wrangler login
npx wrangler deploy
```

Wrangler's build hook runs `npm run build` before deployment. `wrangler.toml` defines `worker/index.js` as the Worker entry, `./dist` as the assets directory, `ASSETS` as the binding, and single-page-application fallback. The Worker serves requests via `env.ASSETS.fetch(request)`. This is a Workers deployment, not Cloudflare Pages.

For CI, configure CLOUDFLARE_API_TOKEN with Workers deployment permissions and CLOUDFLARE_ACCOUNT_ID as secrets. Never commit credentials. Deployment requires a Cloudflare account, valid authentication, and network access. The Worker name is tradebuddy; change it if that existing Worker should not be replaced.

## Features

- Collapsible left navigation, initially collapsed on narrow screens.
- Pre-Market Screener, Watchlist, and Settings empty placeholder workspaces.
- Disabled Crypto item marked Coming Soon.
- Header with current page and Ready status.
- Automatic system Light/Dark theme via prefers-color-scheme, including changes while the app is open.
- Manual Light/Dark toggle saved locally; Use system theme restores automatic matching.
- Neutral light and charcoal dark surfaces, green active/status accents, red secondary badges.
- Keyboard focus indicators, descriptive navigation labels, and skip link.

No market feeds, trading, authentication, or financial calculations are implemented.

## Verification

This scaffold has not been run in a Node/npm environment or deployed by the authoring assistant. Build and deploy success are not verified. Use the commands above to validate your environment. An initial lockfile is not included: npm install creates package-lock.json; commit it after verification and use npm ci for reproducible installs thereafter.
