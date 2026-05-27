import {
  createCascadeReadinessController,
  createMissionProfile,
  createModelProvider,
  tool,
  validateMissionProfile,
  type CascadeReadinessSnapshot,
  type DownloadPolicy,
  type LanguageModelV3,
} from '@kevinmarmstrong/edgekit'
import type { EdgeCascadeWizard } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'

type BrowserScenario =
  | 'chrome-ready'
  | 'nano-downloadable'
  | 'webllm-ready'
  | 'cloud-only'
  | 'enterprise-blocked'
  | 'unsupported'

type Role = 'visitor' | 'customer' | 'support' | 'admin'
type Workflow = 'docs' | 'shopping' | 'support' | 'admin' | 'private-data'
type Visibility = 'show-basic-when-local-unavailable' | 'hide-until-ready' | 'show-always'

type CascadeLabState = {
  browser: BrowserScenario
  downloadPolicy: DownloadPolicy
  role: Role
  workflow: Workflow
  visibility: Visibility
  fallback: boolean
  edgeView: boolean
  approvals: boolean
}

type ToolManifest = {
  name: string
  label: string
  roles: Role[]
  approval?: boolean
  workflow: Workflow[]
}

const defaultState: CascadeLabState = {
  browser: 'chrome-ready',
  downloadPolicy: 'prompt',
  role: 'visitor',
  workflow: 'docs',
  visibility: 'show-basic-when-local-unavailable',
  fallback: true,
  edgeView: true,
  approvals: true,
}

const manifests: ToolManifest[] = [
  { name: 'searchDocs', label: 'Search docs', roles: ['visitor', 'customer', 'support', 'admin'], workflow: ['docs'] },
  { name: 'searchProducts', label: 'Search products', roles: ['visitor', 'customer', 'support', 'admin'], workflow: ['shopping'] },
  { name: 'addToCart', label: 'Add to cart', roles: ['customer', 'support', 'admin'], approval: true, workflow: ['shopping'] },
  { name: 'searchCases', label: 'Search support cases', roles: ['support', 'admin'], workflow: ['support', 'private-data'] },
  { name: 'createCase', label: 'Create support case', roles: ['support', 'admin'], approval: true, workflow: ['support'] },
  { name: 'searchAccounts', label: 'Search accounts', roles: ['admin'], workflow: ['admin', 'private-data'] },
  { name: 'suspendAccount', label: 'Suspend account', roles: ['admin'], approval: true, workflow: ['admin'] },
]

const browserLabels: Record<BrowserScenario, string> = {
  'chrome-ready': 'Chrome AI ready',
  'nano-downloadable': 'Nano downloadable',
  'webllm-ready': 'WebLLM isolated host',
  'cloud-only': 'Cloud route only',
  'enterprise-blocked': 'Enterprise policy blocked',
  unsupported: 'Unsupported browser',
}

const fakeModel = (provider: string): LanguageModelV3 => ({
  provider,
  modelId: provider,
  specificationVersion: 'v3',
}) as LanguageModelV3

let state = { ...defaultState }
let controller = makeController(state)
let events: string[] = []

export function mountCascadeDemo() {
  const root = document.querySelector<HTMLElement>('#cascade-lab')
  if (!root) return

  syncControlsFromState()
  bindControls()
  bindButtons()
  bindWizard()
  renderAll(controller.getSnapshot())
  void runCheck('Initial readiness check')
}

function bindControls() {
  for (const id of ['cascade-browser', 'cascade-download-policy', 'cascade-role', 'cascade-workflow', 'cascade-visibility']) {
    document.getElementById(id)?.addEventListener('change', () => {
      state = readState()
      rebuildController('Scenario updated')
    })
  }
  for (const id of ['cascade-fallback', 'cascade-edgeview', 'cascade-approvals']) {
    document.getElementById(id)?.addEventListener('change', () => {
      state = readState()
      rebuildController('Integration switch updated')
    })
  }
}

function bindButtons() {
  document.getElementById('cascade-run')?.addEventListener('click', () => void runCheck('Manual readiness check'))
  document.getElementById('cascade-reset')?.addEventListener('click', () => {
    state = { ...defaultState }
    events = []
    syncControlsFromState()
    rebuildController('Reset demo')
    void runCheck('Reset readiness check')
  })
  document.getElementById('cascade-accept-download')?.addEventListener('click', () => {
    events.unshift('User accepted local model download prompt')
    void controller.promptDownload('chrome-ai')
  })
  document.getElementById('cascade-use-fallback')?.addEventListener('click', () => {
    events.unshift('User selected transparent basic mode')
    controller.useFallback()
  })
  document.getElementById('cascade-hide')?.addEventListener('click', () => {
    events.unshift('Host app hid agent features for this session')
    controller.hideAgent('Agent features hidden by user or enterprise policy.')
  })
}

function bindWizard() {
  document.querySelector<EdgeCascadeWizard>('edge-cascade-wizard#cascade-lab-wizard')?.configure(controller)
}

async function runCheck(label: string) {
  events.unshift(label)
  await controller.check()
}

function rebuildController(label: string) {
  events.unshift(label)
  controller = makeController(state)
  bindWizard()
  renderAll(controller.getSnapshot())
}

function makeController(next: CascadeLabState) {
  const tools = visibleTools(next)
  return createCascadeReadinessController({
    providers: providersFor(next.browser),
    downloadPolicy: next.downloadPolicy,
    fallback: next.fallback,
    edgeView: next.edgeView,
    approvals: next.approvals,
    tools,
    requiredTools: requiredTools(next.workflow),
    requiredCapabilities: requiredCapabilities(next.workflow),
    visibilityPolicy: next.visibility,
    modelResolveTimeoutMs: 800,
    messages: {
      ready: 'All required capabilities are available. The app can show the full local agent workflow.',
      downloadable: 'A local model can be enabled, but user or enterprise consent is required first.',
      fallback: 'Local model capability is unavailable or declined. The app can run basic mode with limited tools.',
      hidden: 'The app should hide agent-only features until requirements are met.',
      unavailable: 'No local or hosted provider path is currently available for this workflow.',
      error: 'A provider check failed. The app should offer retry or basic mode.',
    },
    onSnapshot: snapshot => renderAll(snapshot),
    onPrompt: action => logEvent(`Prompt user: ${action.label}`),
    onSuggest: action => logEvent(`Suggest next step: ${action.label}`),
    onMessage: action => logEvent(`Message user: ${action.label}`),
    onHide: action => logEvent(`Hide features: ${action.message}`),
  })
}

function providersFor(browser: BrowserScenario) {
  const chrome = createModelProvider({
    id: 'chrome-ai',
    label: 'Chrome AI / Nano',
    resolve: async context => {
      if (browser === 'chrome-ready') {
        context.emitStatus({ provider: 'chrome-ai', status: 'ready', message: 'Chrome AI model is ready.' })
        return fakeModel('chrome-ai')
      }
      if (browser === 'nano-downloadable') {
        const accepted = await context.requestDownload({
          provider: 'chrome-ai',
          modelSize: '1.8GB',
          message: 'Nano is available but not downloaded.',
        })
        if (!accepted) return null
        context.emitStatus({ provider: 'chrome-ai', status: 'downloading', progress: 0.45, message: 'Downloading Nano...' })
        context.emitStatus({ provider: 'chrome-ai', status: 'ready', message: 'Nano is ready after consent.' })
        return fakeModel('chrome-ai')
      }
      if (browser === 'enterprise-blocked') {
        context.emitStatus({ provider: 'chrome-ai', status: 'error', message: 'Enterprise policy blocked Chrome AI.' })
        return null
      }
      context.emitStatus({ provider: 'chrome-ai', status: 'unavailable', message: 'Chrome AI is unavailable.' })
      return null
    },
  })

  const webllm = createModelProvider({
    id: 'webllm',
    label: 'WebLLM',
    resolve: async context => {
      if (browser === 'webllm-ready') {
        context.emitStatus({ provider: 'webllm', status: 'ready', message: 'WebLLM is ready on an isolated host.' })
        return fakeModel('webllm')
      }
      context.emitStatus({ provider: 'webllm', status: 'unavailable', message: 'WebGPU or COOP/COEP is missing.' })
      return null
    },
  })

  const cloud = createModelProvider({
    id: 'cloud-route',
    label: 'Developer cloud route',
    resolve: async context => {
      if (browser === 'cloud-only') {
        context.emitStatus({ provider: 'cloud-route', status: 'ready', message: 'Developer-owned cloud route is reachable.' })
        return fakeModel('cloud-route')
      }
      context.emitStatus({ provider: 'cloud-route', status: 'unavailable', message: 'No cloud route configured for this scenario.' })
      return null
    },
  })

  return [chrome, webllm, cloud]
}

function readState(): CascadeLabState {
  return {
    browser: getSelect('cascade-browser') as BrowserScenario,
    downloadPolicy: getSelect('cascade-download-policy') as DownloadPolicy,
    role: getSelect('cascade-role') as Role,
    workflow: getSelect('cascade-workflow') as Workflow,
    visibility: getSelect('cascade-visibility') as Visibility,
    fallback: getChecked('cascade-fallback'),
    edgeView: getChecked('cascade-edgeview'),
    approvals: getChecked('cascade-approvals'),
  }
}

function syncControlsFromState() {
  setSelect('cascade-browser', state.browser)
  setSelect('cascade-download-policy', state.downloadPolicy)
  setSelect('cascade-role', state.role)
  setSelect('cascade-workflow', state.workflow)
  setSelect('cascade-visibility', state.visibility)
  setChecked('cascade-fallback', state.fallback)
  setChecked('cascade-edgeview', state.edgeView)
  setChecked('cascade-approvals', state.approvals)
}

function visibleManifests(next: CascadeLabState) {
  return manifests.filter(item => item.roles.includes(next.role) && item.workflow.includes(next.workflow))
}

function visibleTools(next: CascadeLabState) {
  return Object.fromEntries(visibleManifests(next).map(item => [item.name, tool({
    description: item.label,
    inputSchema: z.object({ query: z.string().optional() }),
    execute: async input => ({ ok: true, tool: item.name, input }),
    needsApproval: item.approval,
  })]))
}

function requiredTools(workflow: Workflow) {
  if (workflow === 'docs') return ['searchDocs']
  if (workflow === 'shopping') return ['searchProducts', 'addToCart']
  if (workflow === 'support') return ['searchCases', 'createCase']
  if (workflow === 'admin') return ['searchAccounts', 'suspendAccount']
  return ['searchCases']
}

function requiredCapabilities(workflow: Workflow) {
  const base = ['tools', 'edgeview'] as Array<'tools' | 'approvals' | 'edgeview' | 'local-model' | 'cloud-route'>
  if (workflow === 'shopping' || workflow === 'support' || workflow === 'admin') base.push('approvals')
  if (workflow === 'private-data' || workflow === 'admin') base.push('local-model')
  return base
}

function renderAll(snapshot: CascadeReadinessSnapshot) {
  const validation = validateCurrentProfile()
  setText('cascade-action', snapshot.recommendedAction.label)
  setText('cascade-message', snapshot.message)
  setText('cascade-feature-state', featureState(snapshot, validation.ok))
  setText('cascade-feature-message', featureMessage(snapshot))
  setText('cascade-validation', validation.ok ? `${validation.warnings.length} warning${validation.warnings.length === 1 ? '' : 's'}` : `${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'}`)
  setText('cascade-validation-message', validation.ok
    ? validation.warnings.map(issue => issue.message).join(' ') || 'Mission Profile required tools match the current registered tool surface.'
    : validation.errors.map(issue => issue.message).join(' '))
  renderList('cascade-providers', snapshot.providers.map(provider =>
    `${provider.label}: ${provider.status}${provider.modelSize ? ` (${provider.modelSize})` : ''}${provider.message ? ` - ${provider.message}` : ''}`))
  renderList('cascade-capabilities', snapshot.requiredCapabilities.map(capability =>
    `${snapshot.missingCapabilities.includes(capability) ? 'Missing' : 'Ready'}: ${capability}`))
  renderList('cascade-tools', visibleManifests(state).map(item =>
    `${item.label}${item.approval ? ' - approval required' : ''} (${item.name})`))
  renderList('cascade-copy', userCopy(snapshot))
  renderEvents()
  setText('cascade-json', JSON.stringify({
    state,
    scenario: browserLabels[state.browser],
    mode: snapshot.mode,
    action: snapshot.recommendedAction,
    canRunAgent: snapshot.canRunAgent,
    canUseFallback: snapshot.canUseFallback,
    shouldHideFeatures: snapshot.shouldHideFeatures,
    providers: snapshot.providers,
    requiredCapabilities: snapshot.requiredCapabilities,
    missingCapabilities: snapshot.missingCapabilities,
    validation,
  }, null, 2))
}

function validateCurrentProfile() {
  const profile = createMissionProfile({
    id: `cascade-${state.workflow}-v1`,
    mission: state.workflow,
    version: '1.0.0',
    systemPrompt: 'Demonstrate readiness only; do not execute production mutations.',
    requiredTools: requiredTools(state.workflow),
    defaults: { downloadPolicy: state.downloadPolicy, toolChoice: 'required' },
    synthesis: { requiredAttributes: ['provider state', 'permission state', 'recommended user action'] },
  })
  return validateMissionProfile(profile, { registeredTools: visibleTools(state) })
}

function userCopy(snapshot: CascadeReadinessSnapshot) {
  if (snapshot.missingCapabilities.length > 0) {
    return [
      `Do not enable the full agent until ${snapshot.missingCapabilities.join(', ')} is resolved.`,
      'Show the exact missing setup step instead of a generic model error.',
      'Keep the underlying app workflow usable without the sidecar.',
    ]
  }
  if (snapshot.recommendedAction.type === 'continue') {
    return [
      'Show the full agent CTA.',
      'Use local model routing first.',
      'Keep risky tools behind approval gates.',
    ]
  }
  if (snapshot.recommendedAction.type === 'prompt') {
    return [
      'Ask for explicit model-download consent.',
      `Explain model size and provider: ${snapshot.recommendedAction.provider ?? 'local model'}.`,
      'Offer basic mode if the user declines.',
    ]
  }
  if (snapshot.recommendedAction.type === 'fallback') {
    return [
      'Show transparent basic mode.',
      'Disable unsupported agent-only actions.',
      'Keep read-only tools available when permissions allow.',
    ]
  }
  if (snapshot.recommendedAction.type === 'hide') {
    return [
      'Hide the sidecar entry point or show setup instructions.',
      'Do not imply local AI is running.',
      'Let the user retry after changing browser or policy settings.',
    ]
  }
  return [
    'Name the missing capability.',
    'Suggest a supported browser, local model setup, or admin policy change.',
    'Keep the host app usable without the agent.',
  ]
}

function featureState(snapshot: CascadeReadinessSnapshot, profileIsValid: boolean) {
  if (snapshot.shouldHideFeatures) return 'Hidden'
  if (snapshot.canRunAgent && profileIsValid) return 'Full agent'
  if (snapshot.missingCapabilities.length > 0 || !profileIsValid) return 'Needs setup'
  if (snapshot.canUseFallback) return 'Basic mode available'
  return 'Blocked'
}

function featureMessage(snapshot: CascadeReadinessSnapshot) {
  if (snapshot.shouldHideFeatures) return 'Agent-only CTAs should be hidden or disabled until requirements pass.'
  if (snapshot.canRunAgent) return 'The app can enable full sidecar behavior with model, tools, approvals, and EdgeView.'
  if (snapshot.missingCapabilities.length > 0) return 'A required model, tool, permission, approval UI, or EdgeView capability is missing.'
  if (snapshot.canUseFallback) return 'The app can show basic mode while clearly disclosing that no local model is active.'
  return 'The app should block the agent surface and present setup guidance.'
}

function logEvent(message: string) {
  events.unshift(message)
  renderEvents()
}

function renderEvents() {
  renderList('cascade-events', events.slice(0, 12))
}

function getSelect(id: string) {
  return (document.getElementById(id) as HTMLSelectElement | null)?.value ?? ''
}

function setSelect(id: string, value: string) {
  const element = document.getElementById(id) as HTMLSelectElement | null
  if (element) element.value = value
}

function getChecked(id: string) {
  return Boolean((document.getElementById(id) as HTMLInputElement | null)?.checked)
}

function setChecked(id: string, value: boolean) {
  const element = document.getElementById(id) as HTMLInputElement | null
  if (element) element.checked = value
}

function setText(id: string, text: string) {
  const element = document.getElementById(id)
  if (element) element.textContent = text
}

function renderList(id: string, items: string[]) {
  const element = document.getElementById(id)
  if (!element) return
  element.innerHTML = items.length > 0
    ? items.map(item => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>None for this scenario</li>'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
