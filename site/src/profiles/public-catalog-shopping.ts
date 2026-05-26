/**
 * Public Catalog Shopping Mission Profile + Skills
 *
 * This is the canonical example of localizing an Edgekit sidecar using the
 * Skills + Mission Profile pattern.
 *
 * The goal of this profile is to enable high-quality "agent does useful work"
 * and "answers questions about the catalog" experiences using local models by default.
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

export const productSearchSkill = createSkill({
  id: 'product-search',
  name: 'Search Product Catalog',
  description: 'Search the existing product catalog by natural language query, with optional filters for price, size, and color.',
  requiredTools: ['searchProducts'],
  examples: [
    { input: { query: 'running shoes under $100 in size 10' } },
    { input: { query: 'white Nike Dunk Low', size: '9' } },
  ],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: {
    requiredFacts: ['price', 'sizes', 'color'],
    preferredStyle: 'explicit',
  },
  uiAffordances: { preferActionCards: true },
  meta: { category: 'catalog', version: '1.0.0' },
})

export const addToCartSkill = createSkill({
  id: 'add-to-cart',
  name: 'Add to Cart',
  description: 'Add a specific product variant to the cart. This is a mutating action and always requires explicit user approval.',
  requiredTools: ['addToCart'],
  policy: {
    needsApproval: true,
    riskLevel: 'medium',
    approvalMessage: 'Add this item to your cart?',
  },
  uiAffordances: { preferActionCards: true },
  meta: { category: 'commerce', version: '1.0.0' },
})

export const publicCatalogShoppingProfile = createMissionProfile({
  id: 'public-catalog-shopping-v1',
  mission: 'public-catalog-shopping',
  version: '1.0.0',
  systemPrompt: `You are a concise shopping assistant for an existing product catalog.
Always use the product search capability before answering catalog questions.
After receiving tool results, your final response MUST clearly restate the key facts the user asked about (price, available sizes, colorway, and any stock/availability signals) using the exact data returned by the tool. Do not omit requested attributes.
Ask for explicit approval before performing any cart mutations.
Be precise and complete on attributes even when it makes the response slightly longer than the shortest possible answer.`,
  requiredTools: ['searchProducts', 'addToCart'],
  defaults: {
    downloadPolicy: 'never',
    toolChoice: 'required',
  },
  synthesis: {
    requiredAttributes: ['price', 'sizes', 'color'],
    style: 'explicit',
  },
  meta: {
    description: 'Public-facing sidecar for browsing and purchasing from a product catalog. Optimized for local models with high synthesis faithfulness.',
    compatibility: '^0.1.0',
  },
})
