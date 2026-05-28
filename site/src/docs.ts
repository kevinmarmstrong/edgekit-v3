import './styles.css'
import { docsPages, docsPath, getDocsPage } from './docsContent'
import { mountSiteAssistant } from './siteAssistant'

const navGroups = [
  {
    title: 'Start here',
    slugs: ['overview', 'getting-started', '30-minute-sidecar', 'adoption-kit', 'recipes'],
  },
  {
    title: 'Core model',
    slugs: ['concepts', 'mission-profiles', 'knowledge-access', 'skill-optimization', 'outcome-quality'],
  },
  {
    title: 'Implementation',
    slugs: ['api', 'ui', 'cli', 'advanced', 'ecosystem'],
  },
  {
    title: 'Production',
    slugs: [
      'production',
      'runtime-guarantees',
      'distribution-readiness',
      'production-recipes',
      'security-threat-model',
      'migration-upgrades',
    ],
  },
  {
    title: 'Validation',
    slugs: ['testing', 'reproducibility', 'adopter-simulation', 'deployment'],
  },
]

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const root = document.querySelector<HTMLElement>('#docs-root')
const pageSlug = document.body.dataset.docPage ?? 'overview'
const activePage = getDocsPage(pageSlug)
const activeGroup = getNavGroup(activePage.slug)

document.body.classList.add('docs-page')

if (root) {
  document.title = `${activePage.title} · edgekit docs`
  root.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${withBase('/')}" aria-label="edgekit home">
        <span class="brand-mark">ek</span>
        <span>edgekit</span>
      </a>
      <nav aria-label="Docs navigation">
        <a href="${withBase('/docs/')}">Docs</a>
        <a href="${withBase('/#demos')}">Demos</a>
        <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      </nav>
    </header>

    <main class="docs-shell">
      <aside class="docs-sidebar" aria-label="Documentation pages">
        <div class="docs-sidebar-header">
          <a class="docs-back" href="${withBase('/')}">edgekit</a>
          <p>Documentation</p>
        </div>
        <label class="docs-search">
          <span>Search docs</span>
          <input type="search" placeholder="Filter pages..." autocomplete="off" data-docs-filter>
        </label>
        <nav class="docs-nav" data-docs-nav>
          ${renderDocsNav()}
        </nav>
        <div class="docs-sidebar-links">
          <a href="${withBase('/llms.txt')}">llms.txt</a>
          <a href="${withBase('/llms-full.txt')}">Full context</a>
        </div>
      </aside>

      <article class="docs-article">
        <header class="docs-hero">
          <nav class="docs-breadcrumbs" aria-label="Breadcrumb">
            <a href="${withBase('/')}">Home</a>
            <span>/</span>
            <a href="${withBase('/docs/')}">Docs</a>
            <span>/</span>
            <span>${activeGroup}</span>
          </nav>
          <h1>${activePage.title}</h1>
          <p>${activePage.summary}</p>
          <div class="docs-utility-links" aria-label="Documentation utilities">
            <a href="${withBase(markdownPath(activePage.slug))}">Raw Markdown</a>
            <a href="${withBase('/llms-full.txt')}">llms-full.txt</a>
          </div>
        </header>

        ${activePage.sections.map(renderSection).join('')}

        <footer class="docs-next">
          ${renderPreviousNext()}
        </footer>
      </article>

      <aside class="docs-right-rail" aria-label="On this page">
        <p>On this page</p>
        <nav class="docs-toc">
          ${activePage.sections
            .map(section => `<a href="#${section.id}">${section.title}</a>`)
            .join('')}
        </nav>
      </aside>
    </main>
  `

  wireDocsEnhancements(root)
}

mountSiteAssistant()

function renderDocsNav() {
  const pagesBySlug = new Map(docsPages.map(page => [page.slug, page]))
  const groupedSlugs = new Set(navGroups.flatMap(group => group.slugs))
  const groupedNav = navGroups
    .map(group => {
      const links = group.slugs
        .map(slug => pagesBySlug.get(slug))
        .filter(Boolean)
        .map(page => renderDocsNavLink(page!))
        .join('')

      if (!links) return ''
      return `
        <section class="docs-nav-group" data-docs-group>
          <h2>${group.title}</h2>
          <div>${links}</div>
        </section>
      `
    })
    .join('')

  const uncategorizedLinks = docsPages
    .filter(page => !groupedSlugs.has(page.slug))
    .map(renderDocsNavLink)
    .join('')

  if (!uncategorizedLinks) return groupedNav

  return `${groupedNav}
    <section class="docs-nav-group" data-docs-group>
      <h2>Reference</h2>
      <div>${uncategorizedLinks}</div>
    </section>
  `
}

function renderDocsNavLink(page: (typeof docsPages)[number]) {
  return `
    <a
      class="${page.slug === activePage.slug ? 'current' : ''}"
      href="${withBase(docsPath(page))}"
      aria-label="${escapeAttribute(page.navLabel)}"
      data-docs-link
      data-docs-search="${escapeAttribute(`${page.navLabel} ${page.title} ${page.summary}`)}"
    >
      <span>${page.navLabel}</span>
      <small aria-hidden="true">${page.summary}</small>
    </a>
  `
}

function renderSection(section: (typeof activePage.sections)[number]) {
  return `
    <section class="docs-block" id="${section.id}">
      <h2>${section.title}</h2>
      ${section.body.map(paragraph => `<p>${paragraph}</p>`).join('')}
      ${section.diagram ? renderDiagram(section.diagram) : ''}
      ${
        section.bullets
          ? `<ul>${section.bullets.map(item => `<li>${formatInlineCode(item)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        section.code
          ? `<div class="docs-code-block">
              <div class="docs-code-header">
                <span>${section.code.language}</span>
                <button type="button" data-copy-code>Copy</button>
              </div>
              <pre><code data-language="${section.code.language}">${escapeHtml(section.code.text)}</code></pre>
            </div>`
          : ''
      }
    </section>
  `
}

function renderDiagram(diagram: 'architecture' | 'runtime-loop') {
  if (diagram === 'runtime-loop') {
    return `
      <div class="architecture-diagram runtime-loop-diagram" aria-label="Edgekit runtime loop diagram">
        <article><span>1</span><strong>Hydrate context</strong><p>Identity summary, app state, selected memory, and mission profile.</p></article>
        <article><span>2</span><strong>Route model</strong><p>Chrome AI, WebLLM, cloud route, AG-UI backend, or fallback.</p></article>
        <article><span>3</span><strong>Call tools</strong><p>Read tools, Knowledge Access, MCP adapters, and app APIs.</p></article>
        <article><span>4</span><strong>Gate mutations</strong><p>Approval prompts, RBAC, audit trail, and backend authorization.</p></article>
        <article><span>5</span><strong>Render outcome</strong><p>Text, EdgeView cards/forms, activity states, telemetry, and evidence.</p></article>
      </div>
    `
  }
  return `
    <div class="architecture-diagram" aria-label="Edgekit architecture diagram">
      <article>
        <span>Host app owns</span>
        <strong>State, auth, APIs, business logic</strong>
        <p>Tools execute against the same backend, permissions, and records the app already trusts.</p>
      </article>
      <article>
        <span>Localization</span>
        <strong>Skills + Mission Profiles</strong>
        <p>Reviewable artifacts describe the mission, required tools, approvals, synthesis, UI hints, and tests.</p>
      </article>
      <article>
        <span>Edgekit owns</span>
        <strong>Sidecar runtime and UX contract</strong>
        <p>Provider cascade, tool loop, approvals, EdgeView, telemetry, audit primitives, and fallbacks.</p>
      </article>
      <article>
        <span>Providers</span>
        <strong>Local first, explicit escalation</strong>
        <p>Chrome AI, WebLLM, no-model fallback, AG-UI streams, or developer-owned cloud routes.</p>
      </article>
    </div>
  `
}

function renderPreviousNext() {
  const index = docsPages.findIndex(page => page.slug === activePage.slug)
  const previous = docsPages[index - 1]
  const next = docsPages[index + 1]

  return `
    ${previous ? `<a href="${withBase(docsPath(previous))}">Previous: ${previous.navLabel}</a>` : '<span></span>'}
    ${next ? `<a href="${withBase(docsPath(next))}">Next: ${next.navLabel}</a>` : '<span></span>'}
  `
}

function getNavGroup(slug: string) {
  return navGroups.find(group => group.slugs.includes(slug))?.title ?? 'Reference'
}

function markdownPath(slug: string) {
  return slug === 'overview' ? '/docs.md' : `/docs/${slug}.md`
}

function wireDocsEnhancements(container: HTMLElement) {
  const filter = container.querySelector<HTMLInputElement>('[data-docs-filter]')
  const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('[data-docs-link]'))
  const groups = Array.from(container.querySelectorAll<HTMLElement>('[data-docs-group]'))

  filter?.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase()
    links.forEach(link => {
      const haystack = link.dataset.docsSearch?.toLowerCase() ?? link.textContent?.toLowerCase() ?? ''
      link.hidden = query.length > 0 && !haystack.includes(query)
    })
    groups.forEach(group => {
      const groupLinks = Array.from(group.querySelectorAll<HTMLAnchorElement>('[data-docs-link]'))
      group.hidden = groupLinks.every(link => link.hidden)
    })
  })

  container.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach(button => {
    button.addEventListener('click', async () => {
      const block = button.closest('.docs-code-block')
      const code = block?.querySelector('code')?.textContent ?? ''
      if (!code) return

      try {
        await navigator.clipboard.writeText(code)
        button.textContent = 'Copied'
        window.setTimeout(() => {
          button.textContent = 'Copy'
        }, 1400)
      } catch {
        button.textContent = 'Unavailable'
        window.setTimeout(() => {
          button.textContent = 'Copy'
        }, 1400)
      }
    })
  })
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  if (path.startsWith('/#')) return `${basePath}/${path.slice(1)}`
  return `${basePath}${path}`
}

function formatInlineCode(text: string) {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>')
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttribute(text: string) {
  return escapeHtml(text).replaceAll('"', '&quot;')
}
