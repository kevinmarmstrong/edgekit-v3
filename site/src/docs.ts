import './styles.css'
import { docsPages, docsPath, getDocsPage } from './docsContent'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const root = document.querySelector<HTMLElement>('#docs-root')
const pageSlug = document.body.dataset.docPage ?? 'overview'
const activePage = getDocsPage(pageSlug)

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
        <a class="docs-back" href="${withBase('/')}">Home</a>
        <nav>
          ${docsPages
            .map(
              page => `
                <a class="${page.slug === activePage.slug ? 'current' : ''}" href="${withBase(docsPath(page))}">
                  ${page.navLabel}
                </a>
              `,
            )
            .join('')}
        </nav>
      </aside>

      <article class="docs-article">
        <header class="docs-hero">
          <p class="section-label">edgekit docs</p>
          <h1>${activePage.title}</h1>
          <p>${activePage.summary}</p>
        </header>

        <nav class="docs-toc" aria-label="On this page">
          ${activePage.sections
            .map(section => `<a href="#${section.id}">${section.title}</a>`)
            .join('')}
        </nav>

        ${activePage.sections.map(renderSection).join('')}

        <footer class="docs-next">
          ${renderPreviousNext()}
        </footer>
      </article>
    </main>
  `
}

function renderSection(section: (typeof activePage.sections)[number]) {
  return `
    <section class="docs-block" id="${section.id}">
      <h2>${section.title}</h2>
      ${section.body.map(paragraph => `<p>${paragraph}</p>`).join('')}
      ${
        section.bullets
          ? `<ul>${section.bullets.map(item => `<li>${formatInlineCode(item)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        section.code
          ? `<pre><code data-language="${section.code.language}">${escapeHtml(section.code.text)}</code></pre>`
          : ''
      }
    </section>
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
