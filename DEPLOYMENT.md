# Deployment Notes

## GitHub Pages

GitHub Pages is the canonical public docs and demo host for this repo:

https://kevinmarmstrong.github.io/edgekit/

The Pages workflow builds `site/dist` from `main` and deploys it with GitHub Actions. This host is ideal for the documentation site, Chrome AI demos, and basic-mode fallbacks.

## WebLLM Headers

WebLLM works best on a host that can set cross-origin isolation headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

GitHub Pages does not let this repo set those headers, so the public Pages site should not promise WebLLM availability. Use Cloudflare Pages, Vercel, or another configurable host for full Chrome AI -> WebLLM fallback verification.

## Cloudflare Pages Header Example

The repo includes `site/public/_headers`, which Vite copies into `site/dist` for Cloudflare Pages. Cloudflare Pages supports a `_headers` file for custom response headers, and Wrangler Pages can deploy a project with `pages_build_output_dir` in `wrangler.jsonc`.

```text
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: cross-origin
```

Deploy preview:

```bash
pnpm build
cd site
pnpm dlx wrangler pages deploy dist --project-name edgekit
```

Config-backed deploys can use `site/wrangler.jsonc`, which sets:

```json
{
  "name": "edgekit",
  "pages_build_output_dir": "./dist",
  "compatibility_date": "2026-05-24"
}
```

## Vercel Header Example

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```
