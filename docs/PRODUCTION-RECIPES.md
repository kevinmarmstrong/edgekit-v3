# Production Recipes

These recipes show the minimum production shape for real applications.

## Knowledge Access

Treat retrieval as a Skill category, not as a separate chatbot mode. Wrap each knowledge source with `EdgeKnowledgeSource`, expose it through `createKnowledgeTool()` or `createKnowledgeSkill()`, and keep permissions inside the source or backend query.

Use Markdown or JSON for small local knowledge. Use LlamaIndex, LangChain, Qdrant, pgvector, Pinecone, Weaviate, Neo4j GraphRAG, SQL, or private APIs when the source is larger or dynamic. Edgekit should receive normalized results with title, excerpt, source, URI, citations, score, and freshness metadata.

Outcome tests should prove that retrieved facts and citations survive into the final visible answer or generated UI. A successful retrieval call is not enough.

## Telemetry

```ts
chat.configure({
  telemetry: event => {
    analytics.track('edgekit.event', {
      name: event.name,
      sessionId: event.sessionId,
      runId: event.runId,
      toolName: event.toolName,
      approved: event.approved,
      provider: event.provider,
      status: event.status,
    })
  },
})
```

Capture run start/finish, model status, tool calls/results, approval decisions, errors, and UI actions.

## Audit Persistence

```ts
const auditTrail = createAuditTrail({
  sessionId: session.id,
  hash: async value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  sink: entry => fetch('/api/audit/edgekit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  }),
})
```

Persist audit entries server-side for regulated workflows. The browser hash chain is useful evidence, but compliance systems should sign or store entries server-side.

## RBAC And Session Bridge

```ts
chat.configure({
  identityProvider: () => ({
    id: currentUser.id,
    tenantId: currentTenant.id,
    roles: currentUser.roles,
    permissions: currentUser.permissions,
  }),
  toolProvider: ({ input, session }) =>
    filterToolManifestsForSession(toolManifests, session)
      .filter(manifest => /suspend|plan/i.test(input) ? !manifest.readOnly : true)
      .reduce((tools, manifest) => ({ ...tools, [manifest.name]: manifest.tool }), {}),
})
```

Put public identity and permissions in Edgekit context. Keep JWTs and secret claims in the backend or tool execution context.

## State Hydration

```ts
chat.configure({
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart has 2 items. User is choosing shipping.',
  }),
})
```

Summarize current app state. Do not dump raw DOM or secret data.

## Local Vs Cloud Escalation

Use local browser models for intent, tool extraction, page help, simple Q&A, and privacy-sensitive context. Escalate through developer-owned cloud routes for deep multi-source synthesis, policy-required server logging, or tasks where local models repeatedly fail outcome tests.
