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
      'First choose the mission for the sidecar, then add `<edge-chat>` where that agent should live in your app.',
      '',
    'The recommended integration is: define 2-5 Skills, create a Mission Profile for the app surface, import `@kevinmarmstrong/edgekit-ui`, render `<edge-chat>`, call `chat.configure({ model: [chromeAI()], ... })`, apply the profile with `chat.applyMissionProfile(profile)`, and use `chat.registerTools({ ... })` to expose existing app functions such as search, checkout, account lookup, or support-ticket creation.',
    '',
    'Validate the shape with `validateMissionProfile(profile, { registeredTools })` so missing required tools or unsafe profile defaults fail before users hit the sidecar.',
    '',
    'Keep business logic in the existing app. EdgeKit provides the sidecar UI, model cascade, tool orchestration, approvals, activity events, telemetry, and fallbacks; the host app keeps state, auth, permissions, and API execution.',
    '',
    'Then run outcome harness prompts before release to prove tool decisions, approvals, answer faithfulness, generated UI actions, hostile inputs, and fallback behavior.',
    sourceNote,
  ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'starter-path') {
    return [
      'Use the concrete support-workflow starter, not a blank prompt.',
      '',
      'Copy `docs/templates/mission-profile-starter/profile.ts`, keep the two Skills (`support-case-search` and `create-support-ticket`), keep the `support-workflow-v1` Mission Profile, replace the sample tool `execute` bodies with your app APIs, and mount it behind `<edge-chat>`.',
      '',
      'Then validate with `validateMissionProfile(profile, { registeredTools })` and run the starter outcome scenarios from `docs/templates/mission-profile-starter/harness-scenarios.json`. Passing means the read prompt surfaces case facts, ticket creation requires approval, rejection preserves state, and no tool chatter leaks to the user.',
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

  if (intent === 'skill-optimization') {
    return [
      'Use Skill optimization as a measured development loop, not as runtime self-editing.',
      '',
      'Run the live outcome harness against GitHub Pages, map each scenario to the Skill and Mission Profile it exercises, and score the actual user-visible transcript, generated UI, approval state, and safety boundaries per Skill.',
      '',
      'Only accept a candidate Skill edit when it is small, touches allowed fast-state fields such as `description`, `instructions`, `activationExamples`, or `synthesis`, strictly improves held-out validation, and leaves protected slow-state sections such as approval policy, safety invariants, and host-app authority untouched. Ties should be rejected.',
      '',
      'The useful output is a per-skill effect-size report: which prompts improved, which checks failed, what patch was accepted or rejected, and whether the redeployed GitHub Pages site still clears the outcome rubric.',
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
    'A practical path is: define Skills for the app capabilities, create a Mission Profile for the sidecar, add `<edge-chat>`, configure Chrome AI/WebLLM plus any explicit fallback, apply the profile with `chat.applyMissionProfile(profile)`, register existing app functions with `registerTools()`, validate the shape with `validateMissionProfile(profile, { registeredTools })`, turn tool results into CTAs or forms with `registerActions()`, and mark risky tools with `needsApproval` plus telemetry/audit.',
    '',
    'The host app keeps ownership of state, auth, permissions, business logic, and backend execution. EdgeKit stays as the configurable runtime that lets the agent reason over current app context and call only the capabilities you expose.',
    '',
    'Before calling it production-grade, run the outcome harness against realistic prompts: verify tool decisions, approvals, final answer faithfulness, generated UI actions, hostile inputs, and fallback behavior.',
    sourceNote,
  ]
    .filter(Boolean)
    .join('\n')
}

export function detectAnswerIntent(input: string) {
  const normalized = input.toLowerCase()
  if (/\b(jwt|cookie|token|database|db|credential|secret)\b/.test(normalized)) return 'unsafe-secrets-or-database'
  if (/\b(starter|template|30.minute|thirty.minute|new mission|first sidecar|support workflow)\b/.test(normalized)) return 'starter-path'
  if (/\b(skillopt|skill opt|optimi[sz]e|optimization|held[- ]out|bounded edit|per[- ]skill|protected section|protected sections|trainable|gradient|optimizer)\b/.test(normalized) ||
    (/\bskill\b/.test(normalized) && /\b(candidate|edit|edits|patch|protected|tie|ties|harmless|validation)\b/.test(normalized))) {
    return 'skill-optimization'
  }
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
