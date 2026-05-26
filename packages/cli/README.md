# @kevinmarmstrong/edgekit-cli

Documentation indexing tools for Edgekit demos and docs Q&A.

Use the CLI to create a read-only search capability that can be registered as one Skill inside a Mission Profile. The CLI does not make Edgekit a RAG-only system; it prepares app-owned knowledge for a sidecar that can also call tools, render actions, and respect approvals.

```bash
edgekit-index README.md docs --out public/edgekit-docs-index.json
```

The CLI accepts Markdown, MDX, HTML, and plain text files. It writes a portable JSON index with titled chunks that can be registered as a normal Edgekit search tool.

## Recipe scaffolding

Use `edgekit-init` to create starter mission files without copying from docs by hand:

```bash
edgekit-init --list
edgekit-init mission --recipe support-workflow --out edgekit/support
edgekit-init mission --recipe knowledge-skill --out edgekit/policy
edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake
```

Recipes are intentionally small and inspectable. They create Skills, one Mission Profile, app-owned tool placeholders, and starter outcome scenarios. Framework recipes, such as Astro intake plus Knowledge Access, are additive paths; they do not change Edgekit core or hide the host-app ownership boundary.
