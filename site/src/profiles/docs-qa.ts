/**
 * Docs Q&A Mission Profile + Skills
 *
 * Second mission example using the Skills + Mission Profile pattern.
 * This demonstrates reusability of the architecture across very different
 * mission types (catalog shopping vs project documentation Q&A).
 *
 * NOTE ON CURRENT API STATUS (Wave 0 - 2026-05):
 * The `synthesis`, `policy`, and `uiAffordances` fields on Skills and Profiles
 * are currently **recommended authoring contracts** only.
 *
 * They are not yet consumed by the Edgekit runtime for enforcement.
 * They exist so that:
 *   - Developers and agents have a clear place to express intent.
 *   - Future runtime features (automatic approval gates, faithfulness checks,
 *     UI rendering hints) can consume them without breaking changes.
 *
 * Until runtime support lands, these fields are documentation + future-proofing.
 * Executable behavior (approvals, tool execution, rendering) is still controlled
 * via the normal `registerTools`, `registerActions`, and `configure()` paths.
 * Use `requiredTools` to name the app-owned executable tools a profile expects.
 */

import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const searchDocsSkill = createSkill({
  id: 'search-docs',
  name: 'Search Edgekit Documentation',
  description: 'Search the project documentation and return the most relevant sections for a given question.',
  requiredTools: ['searchDocs'],
  examples: [
    { input: { query: 'what problem does edgekit solve for token costs?' } },
  ],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: {
    requiredFacts: ['relevant sections', 'key concepts'],
    preferredStyle: 'explicit',
  },
  meta: { category: 'documentation', version: '1.0.0' },
})

export const docsQaProfile = createMissionProfile({
  id: 'docs-qa-v1',
  mission: 'docs-qa',
  version: '1.0.0',
  systemPrompt: `You are a precise documentation assistant for the edgekit project.
Always search the documentation before answering.
Your answers must cite the specific sections or concepts used and stay faithful to the source material.
Do not hallucinate features or APIs that are not present in the retrieved documentation.
Be concise but complete.`,
  requiredTools: ['searchDocs'],
  defaults: {
    downloadPolicy: 'never',
    toolChoice: 'required',
  },
  synthesis: {
    requiredAttributes: ['relevant sections'],
    style: 'explicit',
  },
  meta: {
    description: 'Q&A sidecar over the edgekit documentation. Optimized for faithful retrieval and citation when using local models.',
    compatibility: '^0.1.0',
  },
})
