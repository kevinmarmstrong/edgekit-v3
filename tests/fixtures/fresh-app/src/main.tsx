import React from 'react'
import { createRoot } from 'react-dom/client'
import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, createMissionProfile, createSkill, modelOptional, tool, validateMissionProfile } from '@kevinmarmstrong/edgekit'
import type { EdgeChat as EdgeChatElement } from '@kevinmarmstrong/edgekit-ui'
import { EdgeChat } from '@kevinmarmstrong/edgekit-react'
import { z } from 'zod'

const searchCases = tool({
  description: 'Search support cases',
  inputSchema: z.object({
    query: z.string(),
    priority: modelOptional(z.enum(['Normal', 'High', 'Urgent'])),
  }),
  execute: async ({ query, priority }) => ({
    results: [{ id: 'CASE-1', query, priority: priority ?? 'Normal', customer: 'Riverside Clinic' }],
  }),
})

const createTicket = tool({
  description: 'Create a support ticket after approval',
  inputSchema: z.object({
    customer: z.string(),
    summary: z.string(),
  }),
  execute: async input => ({ success: true, ticketId: 'TICKET-1', ...input }),
  needsApproval: true,
})

createSkill({
  id: 'support-search',
  name: 'Support Search',
  description: 'Search support cases and surface case facts.',
  requiredTools: ['searchCases'],
})

const supportProfile = createMissionProfile({
  id: 'fresh-support-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search support cases before answering. Ask for approval before ticket creation.',
  requiredTools: ['searchCases', 'createTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['case id', 'customer', 'priority'], style: 'explicit' },
})

const tools = { searchCases, createTicket }
const validation = validateMissionProfile(supportProfile, { registeredTools: tools })
if (!validation.ok) throw new Error(validation.errors.map(issue => issue.message).join('\n'))

const chat = document.querySelector<EdgeChatElement>('edge-chat')
chat?.configure({ model: [chromeAI()] })
chat?.applyMissionProfile(supportProfile)
chat?.registerTools(tools)

createRoot(document.querySelector('#root')!).render(
  <React.StrictMode>
    <EdgeChat missionProfile={supportProfile} />
  </React.StrictMode>,
)
