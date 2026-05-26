// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import type { EdgeAgent, AgentEvent } from '@kevinmarmstrong/edgekit'
import { EdgeChat, createEdgeAgentController } from '../src/index'

describe('edgekit react primitives', () => {
  it('creates a controller that streams agent events into React-friendly state', async () => {
    const agent: EdgeAgent = {
      async *send(_input: string): AsyncGenerator<AgentEvent> {
        yield { type: 'activity', activity: { id: 'a1', label: 'Checking permissions', status: 'started' } }
        yield { type: 'text-delta', text: 'Hello' }
        yield { type: 'done', text: 'Hello' }
      },
      async *respondToApproval(): AsyncGenerator<AgentEvent> {
        yield { type: 'done', text: 'approved' }
      },
      reset: vi.fn(),
    }
    const controller = createEdgeAgentController({ agent })
    const snapshots: string[] = []
    const unsubscribe = controller.subscribe(state => snapshots.push(`${state.status}:${state.text}`))

    await controller.send('hello')
    unsubscribe()

    expect(controller.getSnapshot()).toMatchObject({
      status: 'done',
      text: 'Hello',
      activities: [expect.objectContaining({ label: 'Checking permissions' })],
    })
    expect(snapshots).toContain('streaming:Hello')
  })

  it('renders the web component with an attach ref for imperative configuration', () => {
    const attach = vi.fn()
    const missionProfile = {
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      requiredTools: ['searchDocs'],
    }
    const element = EdgeChat({
      systemPrompt: 'You are helpful.',
      missionProfile,
      placeholder: 'Ask',
      showToolEvents: true,
      onReady: attach,
    })

    expect(element.type).toBe('edge-chat')
    const props = element.props as Record<string, unknown>
    expect(props['system-prompt']).toBe('You are helpful.')
    expect(props.placeholder).toBe('Ask')
    expect(props['show-tool-events']).toBe('')
    expect(typeof props.ref).toBe('function')

    const node = { configure: vi.fn(), applyMissionProfile: vi.fn() }
    ;(props.ref as (value: unknown) => void)(node)
    expect(node.applyMissionProfile).toHaveBeenCalledWith(missionProfile)
    expect(attach).toHaveBeenCalledWith(node)
  })

  it('can also be created through React.createElement for framework interop', () => {
    const element = createElement(EdgeChat, { systemPrompt: 'Sidecar' })
    expect(element.type).toBe(EdgeChat)
    expect(element.props.systemPrompt).toBe('Sidecar')
  })
})
