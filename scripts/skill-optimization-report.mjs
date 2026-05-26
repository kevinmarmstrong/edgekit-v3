import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const currentPath = resolve(repoRoot, process.env.EDGEKIT_SKILL_RESULT ?? 'research-results/agent-suite.json')
const baselinePath = process.env.EDGEKIT_SKILL_BASELINE
  ? resolve(repoRoot, process.env.EDGEKIT_SKILL_BASELINE)
  : ''
const outputPath = resolve(repoRoot, process.env.EDGEKIT_SKILL_OUTPUT ?? 'research-results/skill-optimization-report.json')
const markdownPath = outputPath.replace(/\.json$/i, '.md')
const mapPath = resolve(repoRoot, process.env.EDGEKIT_SKILL_MAP ?? 'evals/skill-optimization/skill-map.json')
const candidatesPath = resolve(repoRoot, process.env.EDGEKIT_SKILL_CANDIDATES ?? 'evals/skill-optimization/candidates.json')
const strict = process.env.EDGEKIT_SKILL_STRICT !== '0'

const edgekit = await import(pathToFileURL(resolve(repoRoot, 'packages/core/dist/index.js')).href)
const current = JSON.parse(await readFile(currentPath, 'utf8'))
const baseline = baselinePath ? JSON.parse(await readFile(baselinePath, 'utf8')) : null
const skillMap = JSON.parse(await readFile(mapPath, 'utf8'))
const candidatePack = JSON.parse(await readFile(candidatesPath, 'utf8'))

const currentSkills = aggregateSkills(current, skillMap)
const baselineSkills = baseline ? aggregateSkills(baseline, skillMap) : {}
const perSkillScores = Object.entries(currentSkills).map(([skillId, score]) => ({
  skillId,
  baselineScore: baselineSkills[skillId]?.heldOutScore ?? score.heldOutScore,
  candidateScore: score.heldOutScore,
}))
const effectSizes = edgekit.summarizeSkillOptimizationScores(perSkillScores)
const candidates = validateCandidates(candidatePack.candidates ?? [], currentSkills, baselineSkills)

const payload = {
  generatedAt: new Date().toISOString(),
  currentResult: relative(currentPath),
  baselineResult: baselinePath ? relative(baselinePath) : null,
  skillMap: skillMap.version,
  candidatePack: candidatePack.version,
  sourceSummary: current.summary,
  skills: currentSkills,
  effectSizes,
  candidates,
  acceptedCandidates: candidates.filter(candidate => candidate.validation.accepted),
  rejectedCandidates: candidates.filter(candidate => !candidate.validation.accepted),
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
await writeFile(markdownPath, renderMarkdown(payload))

console.log(JSON.stringify({
  skills: Object.keys(currentSkills).length,
  acceptedCandidates: payload.acceptedCandidates.length,
  rejectedCandidates: payload.rejectedCandidates.length,
  heldOutFailures: Object.values(currentSkills).reduce((total, skill) => total + skill.requiredFailures, 0),
}, null, 2))
console.log(`Wrote ${outputPath}`)
console.log(`Wrote ${markdownPath}`)

if (strict && payload.rejectedCandidates.some(candidate => candidate.requiredForRelease)) {
  process.exitCode = 1
}

function aggregateSkills(resultFile, mapFile) {
  const bySkill = {}
  for (const result of resultFile.results ?? []) {
    const map = mapFile.suites?.[result.suiteId]
    if (!map?.skillIds?.length) continue
    for (const skillId of map.skillIds) {
      const entry = bySkill[skillId] ?? {
        skillId,
        profileIds: [],
        suites: [],
        prompts: 0,
        checks: 0,
        passedChecks: 0,
        failedChecks: 0,
        requiredFailures: 0,
        scoreSum: 0,
        heldOutPrompts: 0,
        heldOutScoreSum: 0,
        categoryScores: {},
        failedExamples: [],
      }
      bySkill[skillId] = entry
      addUnique(entry.profileIds, map.profileId)
      addUnique(entry.suites, result.suiteId)
      entry.prompts += result.outcome === 'skipped' ? 0 : 1
      entry.scoreSum += result.score ?? 0
      if (map.heldOut && result.outcome !== 'skipped') {
        entry.heldOutPrompts += 1
        entry.heldOutScoreSum += result.score ?? 0
      }
      for (const check of result.checks ?? []) {
        entry.checks += 1
        if (check.passed) entry.passedChecks += 1
        else entry.failedChecks += 1
        if (!check.passed && check.required !== false) {
          entry.requiredFailures += 1
          entry.failedExamples.push({
            suiteId: result.suiteId,
            prompt: result.prompt,
            category: check.category,
            label: check.label,
            details: check.details,
            transcript: result.transcript,
          })
        }
        const category = entry.categoryScores[check.category] ?? { passed: 0, failed: 0, score: 0 }
        if (check.passed) category.passed += 1
        else category.failed += 1
        const total = category.passed + category.failed
        category.score = total === 0 ? 0 : round(category.passed / total)
        entry.categoryScores[check.category] = category
      }
    }
  }

  for (const entry of Object.values(bySkill)) {
    entry.averageScore = entry.prompts === 0 ? 0 : round(entry.scoreSum / entry.prompts)
    entry.heldOutScore = entry.heldOutPrompts === 0 ? entry.averageScore : round(entry.heldOutScoreSum / entry.heldOutPrompts)
    delete entry.scoreSum
    delete entry.heldOutScoreSum
  }
  return bySkill
}

function validateCandidates(candidates, currentSkills, baselineSkills) {
  return candidates.map(candidate => {
    const currentScore = scoreFor(current, candidate.candidateSuiteIds, candidate.skillId, currentSkills)
    const baselineScore = baselineSkills[candidate.skillId]
      ? scoreFor(baseline, candidate.baselineSuiteIds, candidate.skillId, baselineSkills)
      : Math.min(currentScore, candidate.baselineScore ?? currentScore)
    const validation = edgekit.validateSkillOptimizationCandidate({
      skillId: candidate.skillId,
      baselineScore,
      candidateScore: currentScore,
      protectedPaths: candidate.protectedPaths,
      patch: candidate.patch ?? [],
    }, { maxOperations: candidate.maxOperations ?? 8 })
    return {
      skillId: candidate.skillId,
      baselineScore,
      candidateScore: currentScore,
      validation,
      patchOperations: candidate.patch?.length ?? 0,
      requiredForRelease: candidate.requiredForRelease === true,
    }
  })
}

function scoreFor(resultFile, suiteIds, skillId, skills) {
  const skill = skills[skillId]
  if (!skill) return 0
  if (!suiteIds?.length) return skill.heldOutScore
  const selectedSuites = new Set(suiteIds)
  const matched = (resultFile?.results ?? [])
    .filter(result => selectedSuites.has(result.suiteId))
    .filter(result => skill.suites.includes(result.suiteId))
    .filter(result => result.outcome !== 'skipped')
  if (matched.length === 0) return skill.heldOutScore
  return round(matched.reduce((sum, result) => sum + (result.score ?? 0), 0) / matched.length)
}

function renderMarkdown(payload) {
  const skillRows = Object.values(payload.skills)
    .sort((a, b) => a.skillId.localeCompare(b.skillId))
    .map(skill => `| ${skill.skillId} | ${skill.profileIds.join(', ')} | ${skill.heldOutScore.toFixed(3)} | ${skill.averageScore.toFixed(3)} | ${skill.prompts} | ${skill.requiredFailures} |`)
    .join('\n')
  const candidateRows = payload.candidates
    .map(candidate => `| ${candidate.skillId} | ${candidate.baselineScore.toFixed(3)} | ${candidate.candidateScore.toFixed(3)} | ${candidate.validation.improvement.toFixed(3)} | ${candidate.validation.accepted ? 'accepted' : 'rejected'} | ${candidate.validation.issues.map(issue => issue.code).join(', ') || 'none'} |`)
    .join('\n')

  return `# EdgeKit Skill Optimization Report

Generated: ${payload.generatedAt}

Current result: ${payload.currentResult}

Baseline result: ${payload.baselineResult ?? 'current run only'}

Source confidence: ${payload.sourceSummary?.confidenceBand ?? 'unknown'} (${payload.sourceSummary?.confidenceRating ?? 'n/a'})

## Per-Skill Scores

| Skill | Profiles | Held-out score | Average score | Prompts | Required failures |
| --- | --- | ---: | ---: | ---: | ---: |
${skillRows}

## Candidate Gate

| Skill | Baseline | Candidate | Delta | Gate | Issues |
| --- | ---: | ---: | ---: | --- | --- |
${candidateRows || '| n/a | 0 | 0 | 0 | n/a | none |'}

## Failed Examples

${renderFailures(payload.skills)}
`
}

function renderFailures(skills) {
  const failures = Object.values(skills).flatMap(skill =>
    skill.failedExamples.map(example => `### ${skill.skillId} / ${example.suiteId}

Prompt: ${example.prompt}

Failed check: ${example.category} / ${example.label}

\`\`\`text
${example.transcript}
\`\`\``),
  )
  return failures.length ? failures.join('\n\n') : 'No required failed examples.'
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value)
}

function relative(path) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
