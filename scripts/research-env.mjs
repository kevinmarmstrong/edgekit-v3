import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const execFileAsync = promisify(execFile)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, process.env.EDGEKIT_ENV_OUTPUT ?? 'research-results/research-env.json')
const markdownPath = outputPath.replace(/\.json$/i, '.md')
const strict = process.env.EDGEKIT_ENV_STRICT === '1'
const requireRealProviders = process.env.EDGEKIT_REQUIRE_REAL_PROVIDERS === '1'
const siteURL = process.env.EDGEKIT_SUITE_SITE_URL ?? 'http://127.0.0.1:4174/edgekit'

const checks = []
const startedAt = Date.now()
const environment = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  packageManager: '',
  browser: {},
  urls: {
    siteURL,
    ecommerceURL: process.env.EDGEKIT_SUITE_ECOMMERCE_URL ?? 'http://127.0.0.1:4173',
  },
  optionalEnv: {
    cloudRouteURL: Boolean(process.env.EDGEKIT_SUITE_CLOUD_ROUTE_URL),
    agUiEndpoint: Boolean(process.env.EDGEKIT_SUITE_AG_UI_ENDPOINT),
    mcpProxyURL: Boolean(process.env.EDGEKIT_SUITE_MCP_PROXY_URL),
    requireRealProviders,
  },
}

await checkCommand('node is available', 'node', ['--version'], value => value.trim() === process.version)
await checkCommand('pnpm is available', 'pnpm', ['--version'], value => {
  environment.packageManager = `pnpm@${value.trim()}`
  return /^\d+\.\d+\.\d+/.test(value.trim())
})

await checkBrowserCapabilities()

addCheck('environment', 'cloud route env is optional and currently configured only when explicit', !requireRealProviders || Boolean(process.env.EDGEKIT_SUITE_CLOUD_ROUTE_URL), {
  required: requireRealProviders,
  details: requireRealProviders ? 'EDGEKIT_REQUIRE_REAL_PROVIDERS=1 expects EDGEKIT_SUITE_CLOUD_ROUTE_URL for cloud-route quality loops.' : '',
})

const summary = summarize(checks)
const payload = {
  ...environment,
  durationMs: Date.now() - startedAt,
  summary,
  checks,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
await writeFile(markdownPath, renderMarkdown(payload))

console.log(JSON.stringify(summary, null, 2))
console.log(`Wrote ${outputPath}`)
console.log(`Wrote ${markdownPath}`)

if ((strict || requireRealProviders) && summary.requiredFailed > 0) process.exitCode = 1

async function checkCommand(label, cmd, args, validate) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { cwd: repoRoot })
    addCheck('environment', label, validate(stdout), { details: stdout.trim() })
  } catch (error) {
    addCheck('environment', label, false, { details: readableError(error) })
  }
}

async function checkBrowserCapabilities() {
  let browser
  try {
    browser = await launchBrowser()
    const page = await browser.newPage()
    await page.goto('data:text/html,<html><body>edgekit env</body></html>')
    const capabilities = await page.evaluate(async () => {
      const globalScope = globalThis
      return {
        userAgent: navigator.userAgent,
        webGpu: 'gpu' in navigator,
        languageModel: 'LanguageModel' in globalScope,
        aiLanguageModel: Boolean(globalScope.ai?.languageModel),
        indexedDb: 'indexedDB' in globalScope,
        serviceWorker: 'serviceWorker' in navigator,
        crossOriginIsolated: globalScope.crossOriginIsolated,
      }
    })
    environment.browser = capabilities
    addCheck('environment', 'Playwright Chromium launches', true, { details: capabilities.userAgent })
    addCheck('environment', 'IndexedDB is available for cache/journal adapters', capabilities.indexedDb)
    addCheck('environment', 'WebGPU capability is detectable for WebLLM readiness', capabilities.webGpu, { required: requireRealProviders })
    addCheck(
      'environment',
      'Chrome AI/Nano browser API is detectable when real providers are required',
      capabilities.languageModel || capabilities.aiLanguageModel,
      { required: requireRealProviders },
    )
  } catch (error) {
    addCheck('environment', 'Playwright Chromium launches', false, { details: readableError(error) })
  } finally {
    await browser?.close()
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    return chromium.launch({ headless: true })
  }
}

function addCheck(category, label, passed, options = {}) {
  checks.push({
    category,
    label,
    passed: Boolean(passed),
    required: options.required !== false,
    details: options.details ?? '',
  })
}

function summarize(items) {
  const required = items.filter(item => item.required !== false)
  const failed = items.filter(item => !item.passed)
  const requiredFailed = required.filter(item => !item.passed).length
  const requiredPassed = required.length - requiredFailed
  const optionalFailed = items.filter(item => item.required === false && !item.passed).length
  return {
    total: items.length,
    passed: items.length - failed.length,
    failed: failed.length,
    requiredFailed,
    optionalFailed,
    score: required.length === 0 ? 0 : round(requiredPassed / required.length),
  }
}

function renderMarkdown(payload) {
  const rows = payload.checks
    .map(check => `| ${check.label} | ${check.passed ? 'pass' : 'fail'} | ${check.required ? 'yes' : 'no'} | ${check.details || ''} |`)
    .join('\n')
  return `# EdgeKit Research Environment

Generated: ${payload.generatedAt}

Node: ${payload.node}

Package manager: ${payload.packageManager}

Score: ${payload.summary.score}

Required failed: ${payload.summary.requiredFailed}

Optional gaps: ${payload.summary.optionalFailed}

| Check | Result | Required | Details |
| --- | --- | --- | --- |
${rows}
`
}

function readableError(error) {
  return error instanceof Error ? error.message : String(error)
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
