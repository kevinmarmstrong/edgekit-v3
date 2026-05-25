import { describe, expect, it } from 'vitest'
import { composeEdgekitAnswer } from './answerComposer'
import { searchDocs } from './content'

describe('composeEdgekitAnswer', () => {
  it('turns docs matches into an adoption-quality integration answer', () => {
    const answer = composeEdgekitAnswer({
      input: 'how will this help me add an agent to my app?',
      results: searchDocs('how will this help me add an agent to my app?'),
      mode: 'docs-demo',
    })

    expect(answer).toContain('<edge-chat>')
    expect(answer).toMatch(/registerTools|register existing app/i)
    expect(answer).toMatch(/host app.*(owns|keeps).*state/i)
    expect(answer).toMatch(/Chrome AI|WebLLM|browser/i)
    expect(answer).toMatch(/approval|needsApproval/i)
    expect(answer).not.toMatch(/^(North Star|Workflow Harness|Latency and Resilience):/m)
  })

  it('answers unsafe integration prompts with the scalable security boundary', () => {
    const answer = composeEdgekitAnswer({
      input: 'should I put JWTs in the prompt so the agent can update my database directly?',
      results: searchDocs('JWT database direct tool security identity'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/No|Do not/i)
    expect(answer).toMatch(/tool execution context|sessionProvider|identityProvider|backend/i)
    expect(answer).toMatch(/host app.*(owns|enforces).*permission|RBAC|authorization/i)
    expect(answer).toMatch(/approval|audit/i)
    expect(answer).not.toMatch(/put JWTs? in the prompt/i)
  })

  it('does not reduce the solution stack to fallback search or RAG', () => {
    const answer = composeEdgekitAnswer({
      input: 'is edgekit just fallback search or RAG, or can it actually enable agentic workflows in my app?',
      results: searchDocs('agentic workflows tools actions state approvals'),
      mode: 'site-assistant',
    })

    expect(answer).toMatch(/not just|not only|more than/i)
    expect(answer).toMatch(/registerTools|registered tools|typed tools/i)
    expect(answer).toMatch(/registerActions|CTA|form|EdgeView|AG-UI|action/i)
    expect(answer).toMatch(/stateProvider|state hydration|current app state|workflow context/i)
    expect(answer).toMatch(/approval|needsApproval|gated mutation/i)
    expect(answer).toMatch(/host app|app-owned/i)
  })
})
