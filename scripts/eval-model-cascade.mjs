import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.EDGEKIT_EVAL_PORT ?? 4183)
const baseURL = `http://127.0.0.1:${port}`
const modes = (process.env.EDGEKIT_EVAL_MODES ?? 'chrome,cascade')
  .split(',')
  .map(mode => mode.trim())
  .filter(Boolean)
const downloadPolicy = process.env.EDGEKIT_EVAL_DOWNLOAD_POLICY ?? 'never'
const requireRealModel = process.env.EDGEKIT_REQUIRE_REAL_MODEL === '1'
const headless = process.env.EDGEKIT_EVAL_HEADLESS !== '0'
const outputPath = resolve(repoRoot, process.env.EDGEKIT_EVAL_OUTPUT ?? 'test-results/model-cascade-eval.json')

const scenarios = [
  {
    id: 'white-dunks-search',
    prompt: 'find me size nine white nike dunks',
    expectAny: ['Nike Dunk Low', 'Dunk'],
    expectNo: ['Adidas Ultraboost Light -'],
    rejectAny: [/error in the previous tool call/i, /trouble with .*parameters/i, /not accepting null/i],
  },
  {
    id: 'running-under-100',
    prompt: 'show running shoes under $100 size 10',
    expectAny: ['Nike Air Zoom Pegasus', 'Pegasus'],
    rejectAny: [/error in the previous tool call/i, /trouble with .*parameters/i, /not accepting null/i],
  },
  {
    id: 'guarded-cart-action',
    prompt: 'find me size nine white nike dunks and put in cart',
    expectAny: ['approval', 'Approve', 'addToCart', 'cart'],
    rejectAny: [/error in the previous tool call/i, /trouble with .*parameters/i, /not accepting null/i],
  },
]

const server = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port)],
  {
    cwd: resolve(repoRoot, 'examples/ecommerce'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  },
)

server.stdout.on('data', chunk => process.stdout.write(`[preview] ${chunk}`))
server.stderr.on('data', chunk => process.stderr.write(`[preview] ${chunk}`))

try {
  await waitForServer(baseURL)
  const browser = await launchBrowser()
  const reports = []

  for (const mode of modes) {
    for (const scenario of scenarios) {
      reports.push(await runScenario(browser, mode, scenario))
    }
  }

  await browser.close()
  const summary = summarize(reports)
  const payload = {
    generatedAt: new Date().toISOString(),
    baseURL,
    modes,
    downloadPolicy,
    requireRealModel,
    summary,
    reports,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
  console.log(`Wrote ${outputPath}`)

  if (summary.failed > 0 || (requireRealModel && summary.modelUnavailable > 0)) {
    process.exitCode = 1
  }
} finally {
  server.kill('SIGTERM')
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless })
  } catch {
    return chromium.launch({ headless })
  }
}

async function runScenario(browser, mode, scenario) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } })
  const url = `${baseURL}/?modelMode=${encodeURIComponent(mode)}&downloadPolicy=${encodeURIComponent(downloadPolicy)}`
  const report = {
    mode,
    scenario: scenario.id,
    prompt: scenario.prompt,
    status: '',
    outcome: 'unknown',
    sawToolCall: false,
    sawApprovalPrompt: false,
    matchedExpected: false,
    unexpectedText: false,
    messageSample: '',
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.getByTestId('chat-input').fill(scenario.prompt)
    await page.getByTestId('send-button').click()
    await page
      .getByTestId('agent-status')
      .waitFor({ state: 'visible', timeout: 15_000 })

    await page.waitForTimeout(4_000)
    const status = await page.getByTestId('agent-status').innerText()
    const messages = await page.getByTestId('chat-messages').innerText()
    const approvalCount = await page.getByTestId('approval-prompt').count()

    report.status = status
    report.sawToolCall = messages.includes('Tool:')
    report.sawApprovalPrompt = approvalCount > 0
    report.matchedExpected = scenario.expectAny.some(text => messages.includes(text))
    report.unexpectedText = scenario.expectNo?.some(text => messages.includes(text)) ?? false
    report.rejectedTranscript = scenario.rejectAny?.some(pattern => pattern.test(messages)) ?? false
    report.messageSample = messages.slice(-500)

    if (/Basic mode|No local model|unavailable/i.test(status)) {
      report.outcome = 'model-unavailable'
    } else if (report.matchedExpected && !report.unexpectedText && !report.rejectedTranscript) {
      report.outcome = 'passed'
    } else {
      report.outcome = 'failed'
    }
  } catch (error) {
    report.outcome = 'failed'
    report.error = String(error)
  } finally {
    await page.close()
  }

  return report
}

function summarize(reports) {
  return reports.reduce(
    (summary, report) => {
      summary.total += 1
      if (report.outcome === 'passed') summary.passed += 1
      if (report.outcome === 'failed') summary.failed += 1
      if (report.outcome === 'model-unavailable') summary.modelUnavailable += 1
      return summary
    },
    { total: 0, passed: 0, failed: 0, modelUnavailable: 0 },
  )
}

async function waitForServer(url) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until Vite preview binds the port.
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}
