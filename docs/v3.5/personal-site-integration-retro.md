Audience: maintainer

# Personal Site Integration Retro

This retro records the first live install of Edgekit on a vanilla professional website/blog served from Cloudflare Workers. The request was simple: add elegant Q&A using the public docs, not repo-local context.

## What Worked

- The published `@kevinmarmstrong/*` packages installed from npm.
- `<edge-chat>` rendered, accepted prompts, called the site search tool, and produced grounded answers.
- `downloadPolicy: "never"` prevented surprise model downloads for public visitors.
- Chrome AI worked on a supported local browser without provider-specific integration code.
- The host site kept state and knowledge ownership; Edgekit only operated the registered `searchSite` tool.

## Friction Found

- The public quick start was still repo-demo-first instead of adopter-install-first.
- The docs showed fragments but not one copyable static-site path from install to mounted Q&A.
- `mountChat()` existed but was not the primary documented API.
- The default component copy, status badge, and visual theme required shadow-DOM surgery to customize.
- Public no-model fallback was documented as a fallback even though it is the primary path for most public-site visitors.
- Bundling with esbuild pulled optional local-model provider dependencies into the widget path unless the adopter manually stubbed heavy packages.
- Two guessed/linked docs paths, `/docs/architecture/` and `/docs/getting-started/quick-start/`, could return 404 instead of guiding the user to current pages.

## v0.3.x Followups Landed

- The public quick start now starts with npm install and a copyable `mountChat()` static-site Q&A example.
- `<edge-chat>` exposes `agent-title`, `agent-subtitle`, and `status-text` labels.
- `<edge-chat>` exposes CSS custom properties and `::part()` selectors for host-site theming.
- `mountChat()` can now apply a Mission Profile, register tools, set labels, and configure fallback in one call.
- The site emits redirect pages for `/docs/architecture/` and `/docs/getting-started/quick-start/`.
- Default browser provider factories now resolve provider modules lazily inside the package build.

## Still Open

- Ship a dedicated lightweight no-model entrypoint for static public sites so esbuild/no-splitting bundles do not inline WebLLM or MediaPipe paths.
- Enrich `onNoModel` with conversation history and safe access to registered tool implementations so fallback mode does not duplicate search logic.
- Add an even smaller `createChat()` shorthand only if `mountChat()` still feels ceremonial after another real install.
- Document bundle-size recipes for Vite, esbuild, Wrangler, and static Workers once the lightweight entrypoint exists.
