# Distribution Readiness

Use this before publishing Edgekit packages.

## Package Smoke

Run the release packages through a fresh app, not only the monorepo workspace.

```bash
pnpm build
pnpm pack:packages
pnpm test:fresh-app
```

The fresh app must import `@kevinmarmstrong/edgekit`, `@kevinmarmstrong/edgekit-ui`, and `@kevinmarmstrong/edgekit-react` from packed tarballs, render `<edge-chat>`, apply a Mission Profile, register tools, and build.

## Publish Checklist

- Package READMEs lead with Skills + Mission Profiles.
- Internal package dependencies use publishable semver versions, not `workspace:*`.
- `files` include built `dist` and README content.
- Root README links runtime guarantees, starter path, production recipes, and release checks.
- GitHub Pages is rebuilt and smoke-tested after package verification.

## Compatibility Policy

- Core primitives follow semver.
- Mission Profiles should declare `meta.compatibility`.
- Skill/Profile metadata may gain new optional fields without breaking older profiles.
- Runtime behavior changes that affect approvals, tool execution, or provider routing require migration notes and harness proof.
