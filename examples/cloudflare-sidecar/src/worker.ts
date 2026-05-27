export interface Env {
  ASSETS: Fetcher
  EDGEKIT_PROVIDER_LANE?: string
  EDGEKIT_CLOUD_ROUTE_URL?: string
  EDGEKIT_CLOUD_ROUTE_TOKEN?: string
}

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

const knowledge = [
  {
    id: 'kb-cloudflare-host',
    title: 'Cloudflare host requirements',
    body: 'Cloudflare Workers can serve Edgekit demos with COOP and COEP headers, which is required for WebLLM SharedArrayBuffer execution on capable browsers.',
    citation: '/docs/CLOUDFLARE-ARCHITECTURE-PROOF.md#headers',
  },
  {
    id: 'kb-cloud-route',
    title: 'Explicit cloud route',
    body: 'Edgekit should only use a cloud model through a developer-owned route. The route can enforce tenant policy, redact context, and record telemetry before forwarding.',
    citation: '/docs/CLOUDFLARE-ARCHITECTURE-PROOF.md#cloud-route',
  },
  {
    id: 'kb-intake',
    title: 'Approval-gated intake',
    body: 'Intake submission is a mutating workflow. The sidecar can render a form, but the Worker route owns validation, persistence, and authorization.',
    citation: '/docs/CLOUDFLARE-ARCHITECTURE-PROOF.md#intake',
  },
]

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/edgekit/health') {
      return json({ ok: true, lane: env.EDGEKIT_PROVIDER_LANE ?? 'cloudflare-worker' })
    }
    if (url.pathname === '/api/edgekit/knowledge/search') {
      return handleKnowledge(request)
    }
    if (url.pathname === '/api/edgekit/intake') {
      return handleIntake(request)
    }
    if (url.pathname === '/api/edgekit/cloud-route') {
      return handleCloudRoute(request, env)
    }

    const response = await env.ASSETS.fetch(request)
    return withHeaders(response)
  },
}

async function handleKnowledge(request: Request) {
  if (request.method !== 'POST') return methodNotAllowed()
  const input = await request.json().catch(() => ({})) as { query?: string; topK?: number }
  const query = String(input.query ?? '').toLowerCase()
  const topK = Math.min(Math.max(Number(input.topK ?? 4), 1), 6)
  const results = knowledge
    .filter(item => `${item.title} ${item.body}`.toLowerCase().includes(query) || query.length < 3)
    .slice(0, topK)
    .map(item => ({
      id: item.id,
      title: item.title,
      body: item.body,
      citation: item.citation,
      source: 'cloudflare-sidecar-worker',
      score: 1,
    }))
  return json({
    results: results.length > 0 ? results : knowledge.slice(0, 1),
    freshness: { stale: false, updatedAt: new Date().toISOString() },
  })
}

async function handleIntake(request: Request) {
  if (request.method !== 'POST') return methodNotAllowed()
  const input = await request.json().catch(() => ({})) as Record<string, unknown>
  const required = ['name', 'email', 'topic', 'summary']
  const missing = required.filter(key => typeof input[key] !== 'string' || String(input[key]).trim().length === 0)
  if (missing.length > 0) return json({ error: `Missing ${missing.join(', ')}` }, 400)
  return json({
    success: true,
    intakeId: `CF-${crypto.randomUUID().slice(0, 8)}`,
    storedBy: 'cloudflare-worker-route',
    received: input,
  })
}

async function handleCloudRoute(request: Request, env: Env) {
  if (request.method === 'GET') {
    return json({
      ok: true,
      lane: env.EDGEKIT_CLOUD_ROUTE_URL ? 'developer-forwarded-cloud-route' : 'cloudflare-worker-deterministic-stub',
      accepts: ['POST'],
    })
  }
  if (request.method !== 'POST') return methodNotAllowed()
  const body = await request.text()
  if (env.EDGEKIT_CLOUD_ROUTE_URL) {
    const response = await fetch(env.EDGEKIT_CLOUD_ROUTE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.EDGEKIT_CLOUD_ROUTE_TOKEN ? { authorization: `Bearer ${env.EDGEKIT_CLOUD_ROUTE_TOKEN}` } : {}),
      },
      body,
    })
    return withHeaders(response)
  }
  return json({
    provider: 'cloudflare-worker-deterministic-stub',
    text: 'Cloud fallback route reached. Configure EDGEKIT_CLOUD_ROUTE_URL to forward this request to a hosted model provider.',
    receivedBytes: body.length,
  })
}

function methodNotAllowed() {
  return json({ error: 'Method not allowed' }, 405)
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      ...headers,
      'content-type': 'application/json; charset=utf-8',
    },
  })
}

function withHeaders(response: Response) {
  const next = new Response(response.body, response)
  for (const [key, value] of Object.entries(headers)) next.headers.set(key, value)
  return next
}
