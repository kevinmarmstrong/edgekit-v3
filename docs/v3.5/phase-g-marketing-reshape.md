Audience: contributor

# Phase G Marketing Reshape

Phase G can only make browser-local claims against a COOP/COEP host. The ecommerce demo now has that host at `https://edgekit-demo-ecommerce.pages.dev/`.

## Completed

- Created the Cloudflare Pages project `edgekit-demo-ecommerce`.
- Added `public/_headers` to the external ecommerce demo repo with:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Deployed the external ecommerce demo to `https://edgekit-demo-ecommerce.pages.dev/`.
- Committed and pushed the external demo source update: `794fb68 Add Cloudflare Pages COOP mirror`.
- Replaced the landing hero with the Critical Review §4.11 message.
- Added an above-the-fold Edgekit embed snippet.
- Replaced the static wireframe with `site/public/ecommerce-demo.gif`, generated from the live Cloudflare demo.
- Updated hero CTAs to Quickstart, GitHub star, and Watch the 90s demo.
- Swapped the embed snippet to show Chrome AI, WebLLM, and a developer-provided cloud route in one cascade.
- Labeled non-ecommerce demo cards as internal previews until Phase F external replacements exist.
- Tightened the static HTML fallback so no-JS fetches see the new hero, the embed snippet, the demo GIF, and a three-card production-blocker matrix.
- Regenerated the v3.5 core export inventory after the site/script changes: 163 exports.

## Deployment Status

- Local preview smoke is green for the Phase G hero.
- Production GitHub Pages deploy is green for commit `068a46b`.
- Cache-busted production fetch is green: `curl -H 'Cache-Control: no-cache' -sL "https://kevinmarmstrong.github.io/edgekit/?cacheBust=$(date +%s)"` returned the new H1 `Add an AI agent to your existing app. Don't rewrite the app.` and the `appCloudRoute` cascade snippet.
- GitHub Pages currently sends `cache-control: max-age=600`, so stale uncached fetches can temporarily show old content from the CDN.

## Mirror Smoke

- `curl -I https://edgekit-demo-ecommerce.pages.dev/` returned `Cross-Origin-Opener-Policy: same-origin`.
- `curl -I https://edgekit-demo-ecommerce.pages.dev/` returned `Cross-Origin-Embedder-Policy: require-corp`.
- Browser smoke on the deployed mirror reported:
  - `window.crossOriginIsolated === true`
  - Page title: `edgekit ecommerce demo`
  - H1: `Find the right shoe without opening a filter drawer.`
  - Mounted `edge-chat` count: 1
  - Catalog card count: 5

## Remaining

- Reshape docs by audience and add CI for `Audience:` headers.
- Continue Phase F external replacements for the remaining internal preview demos.
