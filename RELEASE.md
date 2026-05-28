Audience: maintainer

# edgekit v0.3.1 release checklist

## Package names

The publishable package set is:

- `@kevinmarmstrong/edgekit`
- `@kevinmarmstrong/edgekit-skills`
- `@kevinmarmstrong/edgekit-knowledge`
- `@kevinmarmstrong/edgekit-governance`
- `@kevinmarmstrong/edgekit-mcp`
- `@kevinmarmstrong/edgekit-agui`
- `@kevinmarmstrong/edgekit-ui`
- `@kevinmarmstrong/edgekit-react`
- `@kevinmarmstrong/edgekit-cli`

The unscoped `edgekit` package name already exists on npm, so the release uses the scoped packages above.

## Verified locally

- `pnpm pack:packages`
- `npm install && npm run typecheck && npm run build` in `edgekit-demo-admin`
- `npm install && npm run typecheck && npm run build` in `edgekit-demo-docs`
- Cloudflare Pages deploy for ecommerce, admin, and docs demos

## Npm publish

Publish with `pnpm publish` so `workspace:^` dependencies are rewritten to concrete registry ranges in the tarball manifests:

```bash
npm login
cd packages/core && pnpm publish --access public --no-git-checks
cd ../skills && pnpm publish --access public --no-git-checks
cd ../knowledge && pnpm publish --access public --no-git-checks
cd ../governance && pnpm publish --access public --no-git-checks
cd ../mcp && pnpm publish --access public --no-git-checks
cd ../agui && pnpm publish --access public --no-git-checks
cd ../ui && pnpm publish --access public --no-git-checks
cd ../react && pnpm publish --access public --no-git-checks
cd ../cli && pnpm publish --access public --no-git-checks
```

`v0.3.1` is the first registry-installable release. `v0.3.0` was superseded
because its tarballs contained unresolved `workspace:^` dependency specs.

After npm publish succeeds:

1. Replace vendored tarball dependencies in the three external demo repos with `^0.3.1`.
2. Run each demo's `npm install`, `npm run typecheck`, and `npm run build`.
3. Commit and push the demo dependency switch.
4. Create GitHub release `v0.3.1` from the shipped repo tag.

## Live demos

- Ecommerce: https://edgekit-demo-ecommerce.pages.dev/
- Docs Q&A: https://edgekit-demo-docs.pages.dev/
- SaaS admin: https://edgekit-demo-admin.pages.dev/

All three are external repos and should install Edgekit from the published `^0.3.1` packages after npm publication is complete.
