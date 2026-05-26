import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const searchAccountsSkill = createSkill({
  id: 'search-accounts',
  name: 'Search Accounts',
  description: 'Find customer accounts before recommending or changing account state.',
  requiredTools: ['searchAccounts'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['account name', 'plan', 'status'], preferredStyle: 'explicit' },
  meta: { category: 'admin', version: '1.0.0' },
})

export const updatePlanSkill = createSkill({
  id: 'update-plan',
  name: 'Update Account Plan',
  description: 'Change an account plan after explicit approval.',
  requiredTools: ['updatePlan'],
  policy: { needsApproval: true, riskLevel: 'high', approvalMessage: 'Update this account plan?' },
  meta: { category: 'admin', version: '1.0.0' },
})

export const suspendAccountSkill = createSkill({
  id: 'suspend-account',
  name: 'Suspend Account',
  description: 'Suspend an account after explicit approval.',
  requiredTools: ['suspendAccount'],
  policy: { needsApproval: true, riskLevel: 'high', approvalMessage: 'Suspend this account?' },
  meta: { category: 'admin', version: '1.0.0' },
})

export const adminWorkflowProfile = createMissionProfile({
  id: 'admin-workflow-v1',
  mission: 'internal-admin',
  version: '1.0.0',
  systemPrompt: `You are a precise SaaS admin assistant.
Always search accounts before recommending or changing account state.
Ask for explicit approval before changing plans or suspending accounts.
After tool results, restate the account name, current status, target change, and approval boundary.`,
  requiredTools: ['searchAccounts', 'updatePlan', 'suspendAccount'],
  defaults: { downloadPolicy: 'never', toolChoice: 'required' },
  synthesis: { requiredAttributes: ['account', 'plan', 'status', 'approval boundary'], style: 'explicit' },
  meta: {
    description: 'Internal admin sidecar for account search, plan changes, and suspensions behind approval gates.',
    compatibility: '^0.1.0',
  },
})
