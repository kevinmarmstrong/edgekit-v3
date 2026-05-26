import { describe, expect, it, vi } from 'vitest'
import {
  applyMissionProfile,
  createMissionProfile,
  createSkill,
  profileToAgentOptions,
  summarizeSkillOptimizationScores,
  validateMissionProfile,
  validateSkillOptimizationCandidate,
} from '../src/index'

describe('mission profile helpers', () => {
  it('does not include empty tools from profile options', () => {
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      tools: {},
      defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    })

    expect(profileToAgentOptions(profile)).toEqual({
      systemPrompt: 'Use catalog tools.',
      toolChoice: 'required',
      downloadPolicy: 'never',
    })
  })

  it('includes non-empty executable profile tools', () => {
    const searchProducts = { execute: vi.fn() }
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      tools: { searchProducts },
    })

    expect(profileToAgentOptions(profile).tools).toEqual({ searchProducts })
  })

  it('warns through an injected logger without reading process.env', () => {
    const warn = vi.fn()
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      synthesis: { requiredAttributes: ['source'], style: 'explicit' },
    })

    applyMissionProfile(profile, { logger: { warn } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('docs-v1'))
  })

  it('can silence profile warnings', () => {
    const warn = vi.fn()
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      synthesis: { requiredAttributes: ['source'], style: 'explicit' },
    })

    applyMissionProfile(profile, { warn: false, logger: { warn } })

    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps required tool names as metadata without creating executable tools', () => {
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      requiredTools: ['searchProducts', 'addToCart'],
    })

    expect(profile.requiredTools).toEqual(['searchProducts', 'addToCart'])
    expect(profileToAgentOptions(profile).tools).toBeUndefined()
  })

  it('validates required tool metadata against registered tools', () => {
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      requiredTools: ['searchProducts', 'addToCart'],
    })

    const result = validateMissionProfile(profile, { registeredTools: { searchProducts: {} } })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'missing-registered-tool',
        message: expect.stringContaining('addToCart'),
      }),
    ])
  })

  it('accepts a complete profile and registered tool surface', () => {
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      requiredTools: ['searchProducts', 'addToCart'],
      defaults: { toolChoice: 'required' },
      synthesis: { requiredAttributes: ['price', 'sizes'], style: 'explicit' },
    })

    const result = validateMissionProfile(profile, { registeredTools: ['searchProducts', 'addToCart'] })

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects required tool choice with no executable or required tools', () => {
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      defaults: { toolChoice: 'required' },
    })

    const result = validateMissionProfile(profile)

    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ code: 'required-tool-choice-without-tools' }))
  })

  it('warns when a profile has no tool contract', () => {
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Answer from state only.',
    })

    const result = validateMissionProfile(profile)

    expect(result.ok).toBe(true)
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'no-tool-contract' }))
  })

  it('keeps router description and activated instructions as separate skill surfaces', () => {
    const skill = createSkill({
      id: 'catalog-search-v1',
      name: 'Catalog Search',
      description: 'Router-visible: answer catalog availability and product facts.',
      instructions: 'Activated body: always restate price, sizes, color, and stock signals from tool results.',
      activationExamples: ['how much are Nike dunks and what sizes are carried?'],
      doNotActivateWhen: ['The user asks for unrelated account administration.'],
      protectedSections: ['policy', 'instructions.safety'],
      requiredTools: ['searchProducts'],
    })

    expect(skill.description).toContain('Router-visible')
    expect(skill.instructions).toContain('Activated body')
    expect(skill.protectedSections).toEqual(['policy', 'instructions.safety'])
  })

  it('accepts bounded skill edits only when held-out validation improves', () => {
    const result = validateSkillOptimizationCandidate({
      skillId: 'catalog-search-v1',
      baselineScore: 0.94,
      candidateScore: 0.97,
      patch: [
        {
          op: 'replace',
          path: 'description',
          value: 'Answer product availability, exact price, size, color, and stock questions.',
          reason: 'Router missed size and color queries.',
        },
      ],
    })

    expect(result).toEqual({
      accepted: true,
      issues: [],
      improvement: 0.03,
    })
  })

  it('rejects tied validation scores and oversized skill patches', () => {
    const result = validateSkillOptimizationCandidate(
      {
        skillId: 'catalog-search-v1',
        baselineScore: 0.97,
        candidateScore: 0.97,
        patch: Array.from({ length: 9 }, (_, index) => ({
          op: 'replace' as const,
          path: `examples.${index}`,
          value: `example ${index}`,
        })),
      },
      { maxOperations: 8 },
    )

    expect(result.accepted).toBe(false)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'no-strict-improvement' }))
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'patch-budget-exceeded' }))
  })

  it('rejects normal optimizer edits to protected slow-state paths', () => {
    const result = validateSkillOptimizationCandidate({
      skillId: 'admin-update-v1',
      baselineScore: 0.91,
      candidateScore: 0.94,
      protectedPaths: ['policy', 'instructions.safety'],
      patch: [
        {
          op: 'replace',
          path: 'policy.needsApproval',
          value: false,
          reason: 'This would improve speed but weaken safety.',
        },
      ],
    })

    expect(result.accepted).toBe(false)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'protected-path-edit' }))
  })

  it('summarizes per-skill effect sizes instead of hiding them in averages', () => {
    expect(summarizeSkillOptimizationScores([
      { skillId: 'catalog-search-v1', baselineScore: 0.72, candidateScore: 0.95 },
      { skillId: 'admin-update-v1', baselineScore: 0.98, candidateScore: 0.99 },
    ])).toEqual([
      expect.objectContaining({ skillId: 'catalog-search-v1', improvement: 0.23 }),
      expect.objectContaining({ skillId: 'admin-update-v1', improvement: 0.01 }),
    ])
  })
})
