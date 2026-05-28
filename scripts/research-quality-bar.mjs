import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scenarioPath = resolve(repoRoot, process.env.EDGEKIT_QUALITY_PROMPTS ?? 'evals/quality-bar/randomized-prompts.json')
const outputPath = resolve(repoRoot, process.env.EDGEKIT_QUALITY_OUTPUT ?? 'research-results/quality-bar.json')
const markdownPath = outputPath.replace(/\.json$/i, '.md')
const seed = Number(process.env.EDGEKIT_QUALITY_SEED ?? '20260528')
const promptLimit = Number(process.env.EDGEKIT_QUALITY_PROMPT_LIMIT ?? '2')
const headless = process.env.EDGEKIT_QUALITY_HEADLESS !== '0'
const ecommerceURL = stripTrailingSlash(process.env.EDGEKIT_QUALITY_ECOMMERCE_URL ?? 'https://edgekit-demo-ecommerce.pages.dev')
const docsURL = stripTrailingSlash(process.env.EDGEKIT_QUALITY_DOCS_URL ?? 'https://kevinmarmstrong.github.io/edgekit/demos/docs')
const llmJudgeCommand = process.env.EDGEKIT_LLM_JUDGE_COMMAND
const requireLlmJudge = process.env.EDGEKIT_REQUIRE_LLM_JUDGE === '1'

const scenarioPack = JSON.parse(await readFile(scenarioPath, 'utf8'))
const browser = await chromium.launch({ headless })
const results = []

try {
  for (const flow of scenarioPack.flows) {
    for (const prompt of selectPrompts(flow.prompts, flow.id)) {
      const result = await runFlow(flow, prompt)
      results.push(result)
    }
  }
} finally {
  await browser.close()
}

const summary = summarize(results)
const payload = {
  generatedAt: new Date().toISOString(),
  seed,
  promptLimit,
  scenarioPack: scenarioPack.version,
  judgeMode: llmJudgeCommand ? 'external-llm' : 'deterministic-rubric',
  requireLlmJudge,
  urls: { ecommerceURL, docsURL },
  summary,
  results,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
await writeFile(markdownPath, renderMarkdown(payload))

console.log(JSON.stringify(summary, null, 2))
console.log(`Wrote ${outputPath}`)
console.log(`Wrote ${markdownPath}`)

if (requireLlmJudge && !llmJudgeCommand) {
  console.error('EDGEKIT_REQUIRE_LLM_JUDGE=1 but EDGEKIT_LLM_JUDGE_COMMAND is not set')
  process.exit(1)
}
if (summary.requiredFailed > 0) process.exit(1)

async function runFlow(flow, prompt) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const startedAt = Date.now()
  let output = ''
  let error = ''
  try {
    if (flow.id === 'ecommerce') {
      await page.goto(`${ecommerceURL}/?modelMode=none&downloadPolicy=never`, { waitUntil: 'networkidle' })
      await sendPrompt(page, prompt)
      output = await waitForAnswerAfterPrompt(page.getByTestId('chat-messages'), prompt, /Nike Dunk|Dunk Low|Basic catalog mode/i)
    } else if (flow.surface === 'docs-qa') {
      await page.goto(`${docsURL}/`, { waitUntil: 'networkidle' })
      const qa = page.locator('#qa')
      await sendPrompt(qa, prompt)
      output = await waitForAnswerAfterPrompt(qa.getByTestId('chat-messages'), prompt, /Edgekit|provider|tools|approvals|host app|local/i)
    } else {
      throw new Error(`Unknown quality flow: ${flow.id}`)
    }
  } catch (caught) {
    error = readableError(caught)
  } finally {
    await page.close()
  }

  const deterministic = deterministicJudge({ flow, prompt, output, error })
  const llmJudge = llmJudgeCommand
    ? await runExternalJudge({ flow, prompt, output, deterministic })
    : { skipped: true, reason: 'EDGEKIT_LLM_JUDGE_COMMAND not set' }

  return {
    id: `${flow.id}:${hash(`${seed}:${prompt}`)}`,
    flow: flow.id,
    surface: flow.surface,
    prompt,
    output,
    durationMs: Date.now() - startedAt,
    required: true,
    outcome: error || !deterministic.passed || llmJudge.passed === false ? 'failed' : 'passed',
    error,
    deterministicJudge: deterministic,
    llmJudge,
  }
}

function deterministicJudge({ flow, output, error }) {
  if (error) return { passed: false, score: 0, missingFacts: flow.requiredFacts, reason: error }
  const normalized = normalize(output)
  const missingFacts = flow.requiredFacts.filter(fact => !factPresent(normalized, fact))
  const score = round((flow.requiredFacts.length - missingFacts.length) / flow.requiredFacts.length)
  return {
    passed: missingFacts.length === 0,
    score,
    missingFacts,
    reason: missingFacts.length ? `Missing facts: ${missingFacts.join(', ')}` : 'All required facts surfaced in user-visible output.',
  }
}

async function runExternalJudge(input) {
  const raw = await runCommand(llmJudgeCommand, JSON.stringify(input))
  try {
    const parsed = JSON.parse(raw)
    return {
      passed: Boolean(parsed.passed),
      score: Number(parsed.score ?? 0),
      reason: String(parsed.reason ?? ''),
      raw: parsed,
    }
  } catch {
    return { passed: false, score: 0, reason: 'External judge did not return JSON.', raw }
  }
}

function runCommand(command, stdin) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', rejectPromise)
    child.on('close', code => {
      if (code === 0) resolvePromise(stdout)
      else rejectPromise(new Error(stderr || `judge exited ${code}`))
    })
    child.stdin.end(stdin)
  })
}

async function sendPrompt(scope, prompt) {
  await scope.getByTestId('chat-input').fill(prompt)
  await scope.getByTestId('send-button').click()
}

async function waitForAnswerAfterPrompt(locator, prompt, expected, timeout = 20_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const text = await locator.innerText().catch(() => '')
    const promptIndex = text.lastIndexOf(prompt)
    const answer = promptIndex >= 0 ? text.slice(promptIndex + prompt.length) : text
    if (expected.test(answer)) return answer.trim()
    await delay(250)
  }
  const text = await locator.innerText().catch(() => '')
  throw new Error(`Timed out waiting for ${expected}. Last text: ${text.replace(/\s+/g, ' ').slice(0, 500)}`)
}

function selectPrompts(prompts, salt) {
  const shuffled = [...prompts].sort((a, b) => seededNumber(`${seed}:${salt}:${a}`) - seededNumber(`${seed}:${salt}:${b}`))
  return promptLimit > 0 ? shuffled.slice(0, promptLimit) : shuffled
}

function summarize(items) {
  const failed = items.filter(item => item.outcome === 'failed')
  const llmSkipped = items.filter(item => item.llmJudge?.skipped).length
  const averageDeterministicScore = items.length
    ? round(items.reduce((sum, item) => sum + item.deterministicJudge.score, 0) / items.length)
    : 0
  return {
    total: items.length,
    passed: items.length - failed.length,
    failed: failed.length,
    requiredFailed: failed.filter(item => item.required).length,
    averageDeterministicScore,
    llmJudgeSkipped: llmSkipped,
  }
}

function renderMarkdown(payload) {
  const rows = payload.results
    .map(result => `| ${result.flow} | ${escapeCell(result.prompt)} | ${result.outcome} | ${result.deterministicJudge.score} | ${result.llmJudge.skipped ? 'skipped' : result.llmJudge.score} | ${result.durationMs} |`)
    .join('\n')
  const failures = payload.results
    .filter(result => result.outcome === 'failed')
    .map(result => `## ${result.id}

- Prompt: ${result.prompt}
- Deterministic judge: ${result.deterministicJudge.reason}
- LLM judge: ${result.llmJudge.reason ?? 'n/a'}

\`\`\`text
${result.output.slice(0, 1500)}
\`\`\``)
    .join('\n\n')

  return `# Edgekit Phase H Quality Bar

Generated: ${payload.generatedAt}

Judge mode: ${payload.judgeMode}

LLM judge required: ${payload.requireLlmJudge ? 'yes' : 'no'}

URLs:

- Ecommerce: ${payload.urls.ecommerceURL}
- Docs: ${payload.urls.docsURL}

Summary:

- Passed: ${payload.summary.passed}
- Failed: ${payload.summary.failed}
- Required failed: ${payload.summary.requiredFailed}
- Deterministic score: ${payload.summary.averageDeterministicScore}
- LLM judge skipped: ${payload.summary.llmJudgeSkipped}

The default judge is a deterministic rubric over user-visible output. Set \`EDGEKIT_LLM_JUDGE_COMMAND\` to an external command that reads JSON on stdin and returns \`{"passed":true,"score":1,"reason":"..."}\` to add an LLM judge. Set \`EDGEKIT_REQUIRE_LLM_JUDGE=1\` when a release gate must fail without that model-backed judge.

| Flow | Prompt | Outcome | Deterministic score | LLM judge score | Duration ms |
| --- | --- | --- | ---: | ---: | ---: |
${rows}

${failures || 'No failed randomized prompts.'}
`
}

function factPresent(text, fact) {
  const normalizedFact = normalize(fact)
  if (text.includes(normalizedFact)) return true
  if (normalizedFact === '6499') return /\b6499\b|\$6499|\$64\.99/.test(text)
  if (normalizedFact === 'sizes 9 10 11') return /\b9\b/.test(text) && /\b10\b/.test(text) && /\b11\b/.test(text)
  if (normalizedFact === 'whiteblack') return /white/.test(text) && /black/.test(text)
  if (normalizedFact === 'host app owns state') return /host app/.test(text) && /state/.test(text)
  return normalizedFact.split(' ').every(part => text.includes(part))
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[$.,/()-]/g, '').replace(/\s+/g, ' ').trim()
}

function seededNumber(value) {
  let hashValue = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hashValue ^= value.charCodeAt(index)
    hashValue = Math.imul(hashValue, 16777619)
  }
  return (hashValue >>> 0) / 4294967295
}

function hash(value) {
  return Math.floor(seededNumber(value) * 0xffffffff).toString(16).padStart(8, '0')
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function readableError(error) {
  return error instanceof Error ? error.message : String(error)
}

function delay(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms))
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
