Audience: contributor

# Phase H Quality Bar

Phase H keeps `pnpm research:suite` as deterministic regression coverage and adds separate outcome-quality layers so public claims do not rest on one aggregate score.

## What Changed

- Added `pnpm research:quality` for randomized ecommerce and docs prompts.
- Added `evals/quality-bar/randomized-prompts.json` as the prompt pack for the new quality layer.
- Added optional external LLM judging through `EDGEKIT_LLM_JUDGE_COMMAND`; the default run is an honest deterministic rubric judge and records when the model judge is skipped.
- Updated provider-matrix defaults to the six Phase H rows: `chrome-ready`, `chrome-downloading`, `webllm-auto`, `webllm-declined`, `server`, and `no-model`.
- Updated `research-results/provider-matrix.md` rendering to show latency, success rate, and tool-call accuracy columns.
- Added `scripts/check-v35-constraints.mjs` and wired it into `pnpm test`.
- Added the `UPGRADE.md` template with a worked v0.2.x to v0.3.x example.

## Provider Matrix Commands

```bash
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 EDGEKIT_SUITE_PROVIDER_MODES=chrome-ready pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=chrome-downloading pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=webllm-auto EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=webllm-declined pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=server EDGEKIT_SUITE_CLOUD_ROUTE_URL=https://edgekit-cloudflare-sidecar.kevinmichaelarmstrong.workers.dev/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=no-model pnpm research:suite
```

## Current Honesty Boundary

`pnpm research:quality` can run without provider secrets and without a model-backed judge. In that mode it records `judgeMode: deterministic-rubric` and `llmJudgeSkipped`. Release claims that need a model judge must set `EDGEKIT_LLM_JUDGE_COMMAND` and `EDGEKIT_REQUIRE_LLM_JUDGE=1`.

The provider matrix exists as a table shape and executable harness. Rows that require Chrome AI, WebGPU, or a server route only become product evidence when run in the matching environment.

## Verification

Use this gate for Phase H changes:

```bash
pnpm test
pnpm typecheck
pnpm --filter @edgekit/site build
pnpm research:quality
node scripts/v35-export-inventory.mjs
git diff --check
```
