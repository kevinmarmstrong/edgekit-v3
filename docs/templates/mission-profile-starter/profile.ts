import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const readSkill = createSkill({
  id: 'replace-with-read-skill',
  name: 'Replace With Read Skill',
  description: 'Describe the read-only capability.',
  requiredTools: ['replaceReadTool'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['replace', 'with', 'facts'], preferredStyle: 'explicit' },
})

export const mutateSkill = createSkill({
  id: 'replace-with-mutation-skill',
  name: 'Replace With Mutation Skill',
  description: 'Describe the risky action.',
  requiredTools: ['replaceMutatingTool'],
  policy: { needsApproval: true, riskLevel: 'high' },
})

export const profile = createMissionProfile({
  id: 'replace-mission-v1',
  mission: 'replace-mission',
  version: '1.0.0',
  systemPrompt: `Describe the mission. Always use app-owned tools. Ask for approval before risky mutations.`,
  requiredTools: ['replaceReadTool', 'replaceMutatingTool'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['replace facts'], style: 'explicit' },
})
