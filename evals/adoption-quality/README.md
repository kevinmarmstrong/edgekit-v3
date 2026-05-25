# EdgeKit Adoption Quality Eval

This suite checks whether EdgeKit gives useful developer-facing answers, not just whether a docs-search tool returned.

- `scenarios.json` defines implementation, value, and safety prompts.
- `rubric.json` defines category thresholds for directness, integration, architecture, safety, value, and transparency.
- `pnpm eval:adoption` runs the browser loop against local docs/demo builds and writes `research-results/adoption-quality.json` plus `research-results/adoption-quality.md`.

The rubric intentionally rejects stock section dumps such as `North Star:` / `Workflow Harness:` answers. Add new prompts here when a real developer question exposes a weak answer, then improve reusable EdgeKit guidance or answer composition rather than hardcoding one demo.

```bash
pnpm eval:adoption
EDGEKIT_ADOPTION_TARGET=live pnpm eval:adoption
EDGEKIT_ADOPTION_HEADLESS=0 pnpm eval:adoption
EDGEKIT_ADOPTION_STRICT=0 pnpm eval:adoption
```
