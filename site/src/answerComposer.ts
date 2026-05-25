import type { DocChunk } from './content'

type ComposeMode = 'docs-demo' | 'site-assistant'

export type ComposeEdgekitAnswerOptions = {
  input: string
  results: Array<Partial<DocChunk> & Record<string, unknown>>
  mode?: ComposeMode
  currentPage?: string
}

export function composeEdgekitAnswer({ input, results, mode = 'docs-demo', currentPage }: ComposeEdgekitAnswerOptions) {
  const intent = detectAnswerIntent(input)
  const sourceNote = sourceLine(results, currentPage, mode)

  if (intent === 'unsafe-secrets-or-database') {
    return [
      'No. Keep JWTs, cookies, API keys, and database credentials out of the model prompt.',
      '',
      'EdgeKit should call only host-owned tools. Your app or backend keeps the real session in the tool execution context through `sessionProvider`, `identityProvider`, `withToolContext()`, or your normal server authorization path. The host app enforces RBAC, tenant boundaries, and row-level permissions before any database mutation runs.',
      '',
      'For risky actions, expose a narrow tool, mark it for approval, and record telemetry/audit events. The agent can propose the action; the application still owns permission checks and execution.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'first-step') {
    return [
      'First add `<edge-chat>` where the agent should live in your app, then configure it with your local-first model path and registered tools.',
      '',
      'The minimum integration is: import `@kevinmarmstrong/edgekit-ui`, render `<edge-chat>`, call `chat.configure({ model: [chromeAI()], ... })`, and use `chat.registerTools({ ... })` to expose existing app functions such as search, checkout, account lookup, or support-ticket creation.',
      '',
      'Keep business logic in the existing app. EdgeKit provides the sidecar UI, model cascade, tool orchestration, approvals, activity events, telemetry, and fallbacks; the host app keeps state, auth, permissions, and API execution.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'chatbot-difference') {
    return [
      'EdgeKit is different from embedding a chatbot because it is an in-app agent sidecar wired to app-owned tools and workflow UI.',
      '',
      'A chatbot usually answers text beside the product. EdgeKit sits inside the product, can search docs or app data through registered tools, render CTAs/forms through EdgeView or AG-UI, ask for approval before risky mutations, and resume the host app workflow after the user acts.',
      '',
      'The boundary is the important part: EdgeKit orchestrates the agent loop, while the host app owns state, identity, permissions, and business logic.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'token-cost') {
    return [
      'This is app-agent infrastructure economics, not SaaS subscription pricing.',
      '',
      'Use EdgeKit when you want agent UX without making every user message a variable cloud-token expense.',
      '',
      'The default cascade runs Chrome AI, WebLLM, or another browser-local model first, so common classification, Q&A, tool extraction, and workflow help run on the visitor device. That makes heavy engagement less likely to become an unbounded API bill.',
      '',
      'Cloud routes still fit the architecture, but they are explicit, developer-provided fallbacks for work that needs a stronger model. You decide which prompts can leave the browser and which stay local for cost, privacy, latency, or policy reasons.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'agentic-not-rag') {
    return [
      'EdgeKit is not just fallback search or RAG. Search can be one tool, but the stack is meant to enable agentic workflows inside the app.',
      '',
      'The agent can use `registerTools()` to call typed, app-owned capabilities; use `stateProvider` for current page and workflow context; render CTAs, forms, and generated UI through `registerActions()`, EdgeView, or AG-UI; and pause risky mutations behind `needsApproval`, telemetry, and audit.',
      '',
      'That means the model can help a user search, choose, fill, approve, and continue a workflow while the host app still owns state, identity, permissions, business logic, and final execution.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    'EdgeKit helps you add an agent to an app by giving you the browser-native sidecar, model cascade, tool loop, and approval/UI contracts so you do not have to rebuild those pieces from scratch.',
    '',
    'A practical path is: add `<edge-chat>`, configure Chrome AI/WebLLM plus any explicit fallback, register existing app functions with `registerTools()`, turn tool results into CTAs or forms with `registerActions()`, and mark risky tools with `needsApproval` plus telemetry/audit.',
    '',
    'The host app keeps ownership of state, auth, permissions, business logic, and backend execution. EdgeKit stays as the configurable runtime that lets the agent reason over current app context and call only the capabilities you expose.',
    sourceNote,
  ]
    .filter(Boolean)
    .join('\n')
}

export function detectAnswerIntent(input: string) {
  const normalized = input.toLowerCase()
  if (/\b(jwt|cookie|token|database|db|credential|secret)\b/.test(normalized)) return 'unsafe-secrets-or-database'
  if (/\b(just|only|fallback|rag|search)\b/.test(normalized) && /\b(agentic|workflow|actions?|tools?|app)\b/.test(normalized)) {
    return 'agentic-not-rag'
  }
  if (/\b(first|start|begin|install|add first|what do i add)\b/.test(normalized)) return 'first-step'
  if (/\b(chatbot|chat bot|different|instead of chat)\b/.test(normalized)) return 'chatbot-difference'
  if (/\b(cost|token|cloud|bill|spend|paying|api|pricing|economics|infrastructure|liability)\b/.test(normalized)) return 'token-cost'
  return 'add-agent'
}

function sourceLine(results: Array<Partial<DocChunk> & Record<string, unknown>>, currentPage: string | undefined, mode: ComposeMode) {
  const titles = results
    .map(result => (typeof result.title === 'string' ? result.title : ''))
    .filter(Boolean)
    .slice(0, 3)
  const prefix = mode === 'site-assistant' && currentPage ? `Grounded in docs search from ${currentPage}` : 'Grounded in docs search'
  if (titles.length === 0) return `${prefix}.`
  return `${prefix}: ${titles.join(', ')}.`
}
