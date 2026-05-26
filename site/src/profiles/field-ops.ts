import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const searchWorkOrdersSkill = createSkill({
  id: 'search-work-orders',
  name: 'Search Work Orders',
  description: 'Find field-service work orders by customer, asset, priority, SLA, part need, technician, or current status.',
  instructions: [
    'Search work orders before recommending dispatch, inventory, or schedule changes.',
    'Restate customer, priority, SLA, needed part, assigned technician, and current status from tool results.',
    'If the user asks for action, identify the safest next app-owned tool and keep the final execution under the host app.',
  ].join(' '),
  activationExamples: [
    'what is blocking Riverside Clinic?',
    'find urgent work orders needing a compressor',
    'show unassigned critical jobs',
  ],
  requiredTools: ['searchWorkOrders'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['customer', 'priority', 'SLA', 'part', 'status'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: {
    slowStatePaths: ['policy', 'instructions.safety'],
    fastStatePaths: ['description', 'instructions', 'activationExamples', 'synthesis'],
    maxPatchOperations: 8,
  },
  meta: { category: 'field-ops', version: '1.0.0' },
})

export const reserveInventorySkill = createSkill({
  id: 'reserve-inventory',
  name: 'Reserve Inventory',
  description: 'Reserve a field-service part for a specific work order after user confirmation.',
  instructions: [
    'Only reserve inventory for a specific work order, part SKU, and quantity.',
    'Require a visible user action or approval before changing inventory.',
    'After execution, confirm the work order, reserved part, quantity, and remaining available stock.',
  ].join(' '),
  activationExamples: [
    'reserve one compressor for Riverside',
    'hold part CMP-44 for WO-1842',
  ],
  doNotActivateWhen: [
    'The user only asks for status or triage.',
    'The part, work order, or quantity is ambiguous.',
  ],
  requiredTools: ['reserveInventory'],
  policy: { needsApproval: true, riskLevel: 'medium', approvalMessage: 'Reserve this part for the work order?' },
  synthesis: { requiredFacts: ['work order', 'part', 'quantity', 'remaining stock'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['quantity'] },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: {
    slowStatePaths: ['policy', 'instructions.safety'],
    fastStatePaths: ['description', 'instructions', 'activationExamples', 'synthesis'],
    maxPatchOperations: 8,
  },
  meta: { category: 'field-ops', version: '1.0.0' },
})

export const assignTechnicianSkill = createSkill({
  id: 'assign-technician',
  name: 'Assign Technician',
  description: 'Assign an available technician to a work order after user confirmation.',
  instructions: [
    'Only assign a technician when the work order and technician are both specific.',
    'Prefer technicians whose skills and region match the asset and site.',
    'Confirm the assigned technician, ETA, status, and SLA impact after execution.',
  ].join(' '),
  activationExamples: [
    'assign Ava to Riverside',
    'dispatch a technician for the critical clinic outage',
  ],
  doNotActivateWhen: [
    'The user only asks for work-order details.',
    'The technician or region is ambiguous.',
  ],
  requiredTools: ['assignTechnician'],
  policy: { needsApproval: true, riskLevel: 'medium', approvalMessage: 'Assign this technician to the work order?' },
  synthesis: { requiredFacts: ['technician', 'ETA', 'status', 'SLA'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true, suggestedFields: ['technicianId', 'eta'] },
  protectedSections: ['policy', 'instructions.safety'],
  optimization: {
    slowStatePaths: ['policy', 'instructions.safety'],
    fastStatePaths: ['description', 'instructions', 'activationExamples', 'synthesis'],
    maxPatchOperations: 8,
  },
  meta: { category: 'field-ops', version: '1.0.0' },
})

export const fieldOpsProfile = createMissionProfile({
  id: 'field-ops-dispatch-v1',
  mission: 'field-service-erp-dispatch',
  version: '1.0.0',
  systemPrompt: `You are a field-service ERP sidecar for dispatch and inventory workflows.
Always search work orders before recommending inventory reservations or technician assignment.
After tool results, restate customer, priority, SLA, part requirement, current status, and technician or inventory impact.
Do not mutate inventory or assignments without a visible user action or approval.
Keep the ERP system authoritative for stock counts, technician availability, work-order state, and audit events.`,
  requiredTools: ['searchWorkOrders', 'reserveInventory', 'assignTechnician'],
  defaults: { downloadPolicy: 'never', toolChoice: 'required' },
  synthesis: {
    requiredAttributes: ['customer', 'priority', 'SLA', 'part', 'status', 'approval boundary'],
    style: 'explicit',
  },
  meta: {
    description: 'Internal ERP sidecar for field-service work order triage, part reservation, and technician dispatch.',
    compatibility: '^0.1.0',
  },
})
