# edgekit coding instructions

Read `AGENTS.md` before changing this repo. Edgekit is a browser-native agent sidecar with configurable adapters, not a hosted chatbot platform.

Prefer reusable primitives in `packages/core`, framework-neutral rendering in `packages/ui`, and honest docs/demos in `site`. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and relevant Playwright tests before proposing release changes.
