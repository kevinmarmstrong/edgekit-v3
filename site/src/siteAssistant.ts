import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, tool } from '@kevinmarmstrong/edgekit'
import type { EdgeTelemetrySink } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { searchDocs } from './content'

type SiteAssistantOptions = {
  telemetry?: EdgeTelemetrySink
}

const demoLinks = [
  { label: 'Ecommerce retrofit', href: '/demos/ecommerce/', description: 'Product search, generated add-to-cart CTAs, and approval gates.' },
  { label: 'Docs Q&A', href: '/demos/docs/', description: 'Project documentation exposed as a search tool.' },
  { label: 'AG-UI event stream', href: '/demos/ag-ui/', description: 'Generated forms, charts, tables, and cards from an event stream.' },
  { label: 'SaaS admin workflow', href: '/demos/admin/', description: 'Account search, plan changes, and suspensions behind approval.' },
  { label: 'Mission control', href: '/demos/mission-control/', description: 'Telemetry for runs, tools, approvals, and model fallback.' },
]

const siteSearchTool = tool({
  description: 'Search edgekit documentation and project guidance for the current site visitor.',
  inputSchema: z.object({
    query: z.string().describe('Question or topic to search for'),
  }),
  execute: async ({ query }) => ({
    query,
    currentPage: currentPageSummary(),
    results: searchDocs(query),
  }),
})

const listDemosTool = tool({
  description: 'List the public edgekit demo pages and what each one proves.',
  inputSchema: z.object({
    focus: z.string().optional().describe('Optional demo area such as ecommerce, admin, AG-UI, docs, or telemetry'),
  }),
  execute: async ({ focus }) => {
    const normalized = focus?.toLowerCase()
    const demos = normalized
      ? demoLinks.filter(demo => `${demo.label} ${demo.description}`.toLowerCase().includes(normalized))
      : demoLinks
    return { currentPage: currentPageSummary(), demos }
  },
})

export function mountSiteAssistant(options: SiteAssistantOptions = {}) {
  if (document.querySelector('#site-assistant')) return

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const wrapper = document.createElement('aside')
  wrapper.id = 'site-assistant'
  wrapper.className = 'site-assistant'
  wrapper.dataset.open = 'false'
  wrapper.setAttribute('aria-label', 'edgekit site assistant')
  wrapper.innerHTML = `
    <button class="site-assistant-toggle" type="button" aria-expanded="false" aria-controls="site-assistant-panel">
      <span>Dogfood assistant</span>
      <strong>Ask edgekit</strong>
    </button>
    <section class="site-assistant-panel" id="site-assistant-panel" aria-label="Ask edgekit about this site">
      <header>
        <div>
          <span>Running on this site</span>
          <strong>edgekit assistant</strong>
        </div>
        <button class="site-assistant-close" type="button" aria-label="Close site assistant">Close</button>
      </header>
      <edge-chat
        id="site-assistant-chat"
        system-prompt="You are the edgekit site assistant. Use searchDocs for project questions and listDemos when the user asks what to try. Keep answers concise and point to the most relevant demo or docs page."
        placeholder="Ask about edgekit or which demo to try"
      ></edge-chat>
    </section>
  `
  document.body.appendChild(wrapper)

  const toggle = wrapper.querySelector<HTMLButtonElement>('.site-assistant-toggle')
  const close = wrapper.querySelector<HTMLButtonElement>('.site-assistant-close')
  const setOpen = (open: boolean) => {
    wrapper.dataset.open = open ? 'true' : 'false'
    toggle?.setAttribute('aria-expanded', String(open))
  }
  toggle?.addEventListener('click', () => setOpen(wrapper.dataset.open !== 'true'))
  close?.addEventListener('click', () => setOpen(false))

  const chat = wrapper.querySelector<EdgeChat>('edge-chat#site-assistant-chat')
  chat?.configure({
    sessionId: 'site-dogfood-assistant',
    telemetry: options.telemetry,
    model: [chromeAI()],
    downloadPolicy: 'never',
    onNoModel: ({ input }) => answerSiteQuestion(input, basePath),
  })
  chat?.registerTools({ searchDocs: siteSearchTool, listDemos: listDemosTool })
}

function answerSiteQuestion(input: string, basePath: string) {
  const normalized = input.toLowerCase()
  if (normalized.includes('demo') || normalized.includes('try') || normalized.includes('show')) {
    return [
      'Local browser AI is unavailable here, so the dogfood assistant answered through its deterministic site map.',
      '',
      ...demoLinks.map(demo => `${demo.label}: ${demo.description} ${basePath}${demo.href}`),
    ].join('\n')
  }

  const matches = searchDocs(input)
  if (matches.length === 0) {
    return 'Local browser AI is unavailable here, and the dogfood assistant did not find a matching docs section.'
  }

  return [
    'Local browser AI is unavailable here, so the dogfood assistant used the same docs-search fallback exposed to adopters.',
    '',
    `Current page: ${currentPageSummary()}`,
    '',
    ...matches.map(match => `${match.title}: ${match.body}`),
  ].join('\n\n')
}

function currentPageSummary() {
  const path = window.location.pathname
  const title = document.title || 'edgekit'
  const pageLabel = document.querySelector<HTMLHeadingElement>('h1')?.textContent?.trim() ?? 'edgekit page'
  return `${title} at ${path}; primary heading: ${pageLabel}`
}
