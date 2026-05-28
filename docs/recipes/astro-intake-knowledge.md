Audience: adopter

# Astro Intake And Knowledge Recipe

Use this recipe when an Astro site needs a local-first sidecar that can answer questions from site knowledge and collect an intake request.

```bash
edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake
```

## What It Creates

- `edgekit-profile.ts`: Knowledge Access Skill, intake Skill, Mission Profile, and tool registry.
- `KnowledgeSidecar.astro`: Astro component that mounts `<edge-chat>`, validates the profile, configures Chrome AI, applies the profile, and registers tools.
- `harness-scenarios.json`: starter outcome scenarios.
- `README.md`: replacement notes.

## What The App Owns

Replace the generated placeholder endpoints:

- `/api/edgekit/knowledge/search`: your Markdown, CMS, vector, graph, or private search pipeline.
- `/api/edgekit/intake`: your persistence, CRM, email, notification, spam controls, and authorization.

Do not put API keys, cookies, CRM credentials, email tokens, or private session claims into prompts, state summaries, or Markdown memory.

## Outcome Scenarios

Test at least:

- Cited knowledge answer.
- No-evidence answer that refuses to invent.
- Intake submission requires approval.
- Rejection preserves state and does not write to the CRM.
- Hostile prompt cannot silently submit forms.

## Scaling The Recipe

The same shape works for Next.js, Remix, Vue, Svelte, and plain Vite. The framework-specific part is only the mount component and server route shape. The Skills, Mission Profile, tools, Knowledge Access contract, approval policy, and outcome tests should remain portable.
