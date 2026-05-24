import { streamText as aiStreamText, stepCountIs, tool } from 'ai'
import type { ModelMessage } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { z } from 'zod'

export { stepCountIs, tool }
export type { LanguageModelV3 }

export function modelOptional<T extends z.ZodType>(schema: T) {
  return z.preprocess(value => (value === null ? undefined : value), schema.optional())
}

export type EdgeFieldOption = {
  label: string
  value: string
}

export type EdgeField = {
  name: string
  label: string
  type: 'select' | 'text' | 'number'
  options?: EdgeFieldOption[]
  required?: boolean
  value?: string | number
}

export type EdgeAction = {
  id: string
  label: string
  toolName: string
  description?: string
  input?: Record<string, unknown>
  fields?: EdgeField[]
  successMessage?: string | ((output: unknown, input: Record<string, unknown>) => string)
}

export type EdgeActionContext = {
  toolName: string
  input: unknown
  output: unknown
}

export type EdgeViewNode =
  | { type: 'text'; id?: string; text: string }
  | { type: 'card'; id?: string; title: string; description?: string; children?: EdgeViewNode[] }
  | {
      type: 'form'
      id: string
      toolName: string
      submitLabel: string
      input?: Record<string, unknown>
      fields?: EdgeField[]
      successMessage?: string | ((output: unknown, input: Record<string, unknown>) => string)
    }
  | { type: 'table'; id?: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }
  | {
      type: 'chart'
      id?: string
      chartType: 'bar'
      title?: string
      data: Array<{ label: string; value: number }>
    }

export function actionsToEdgeView(actions: EdgeAction[]): EdgeViewNode[] {
  return actions.map(action => ({
    type: 'card',
    id: `${action.id}-card`,
    title: action.label,
    description: action.description,
    children: [
      {
        type: 'form',
        id: action.id,
        toolName: action.toolName,
        submitLabel: action.label,
        input: action.input,
        fields: action.fields,
        successMessage: action.successMessage,
      },
    ],
  }))
}

export type DownloadPolicy = 'auto' | 'prompt' | 'never'

export type ModelStatus =
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'unavailable'
  | 'error'

export interface ModelStatusEvent {
  provider: string
  status: ModelStatus
  progress?: number
  message: string
}

export interface DownloadPromptEvent {
  provider: string
  modelSize?: string
  message: string
}

export interface NoModelEvent {
  availableTools: string[]
  input: string
  message: string
}

export interface ResolveModelContext {
  downloadPolicy: DownloadPolicy
  emitStatus(event: ModelStatusEvent): void
  requestDownload(event: DownloadPromptEvent): Promise<boolean>
  timeoutMs?: number
}

export interface ModelProvider {
  id: string
  label: string
  resolve(context: ResolveModelContext): Promise<LanguageModelV3 | null>
}

export interface ResolvedModel {
  provider: ModelProvider
  model: LanguageModelV3
}

export type AgentEvent =
  | { type: 'status'; event: ModelStatusEvent }
  | { type: 'text-delta'; text: string }
  | { type: 'tool-call'; toolName: string; toolCallId: string; input: unknown }
  | { type: 'tool-result'; toolName: string; toolCallId: string; output: unknown }
  | { type: 'view'; view: EdgeViewNode | EdgeViewNode[] }
  | { type: 'approval-request'; approvalId: string; toolCall: unknown }
  | { type: 'no-model'; message: string }
  | { type: 'error'; error: unknown }
  | { type: 'done'; text: string }

type StreamTextFn = typeof aiStreamText

export interface CreateAgentOptions {
  systemPrompt: string
  tools: Record<string, unknown>
  model?: Array<ModelProvider | LanguageModelV3>
  downloadPolicy?: DownloadPolicy
  maxSteps?: number
  modelResolveTimeoutMs?: number
  onModelStatus?: (event: ModelStatusEvent) => string | null | void
  onDownloadPrompt?: (event: DownloadPromptEvent) => boolean | Promise<boolean>
  onNoModel?: (event: NoModelEvent) => string | null | void
  streamText?: StreamTextFn
}

export interface EdgeAgent {
  send(input: string): AsyncGenerator<AgentEvent>
  respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent>
  reset(): void
}

export type AgUiEvent = Record<string, unknown> & { type: string }

export interface AgUiRunInput {
  input: string
  messages: ModelMessage[]
  resume?: Array<{ approvalId: string; approved: boolean; reason?: string }>
}

export interface CreateAgUiAgentOptions {
  endpoint?: string
  run?: (input: AgUiRunInput) => AsyncIterable<AgUiEvent> | Promise<AsyncIterable<AgUiEvent>>
  fetch?: typeof fetch
}

export function agUiEventToAgentEvents(event: AgUiEvent): AgentEvent[] {
  const type = normalizeAgUiType(event.type)

  if (type === 'TEXT_MESSAGE_CONTENT' || type === 'TEXT_MESSAGE_CHUNK') {
    const text = String(event.delta ?? event.text ?? event.content ?? '')
    return text ? [{ type: 'text-delta', text }] : []
  }

  if (type === 'TOOL_CALL_RESULT') {
    return [
      {
        type: 'tool-result',
        toolCallId: String(event.toolCallId ?? event.id ?? 'tool-result'),
        toolName: String(event.toolCallName ?? event.toolName ?? event.name ?? 'tool'),
        output: event.content ?? event.result ?? event.output,
      },
    ]
  }

  if (type === 'CUSTOM') {
    const name = String(event.name ?? event.eventName ?? '')
    if (['edgekit.view', 'a2ui', 'a2ui.view'].includes(name)) {
      return [{ type: 'view', view: (event.value ?? event.payload ?? event.data) as EdgeViewNode | EdgeViewNode[] }]
    }
  }

  if (type === 'RUN_ERROR') {
    return [{ type: 'error', error: event.message ?? event.error ?? 'AG-UI run failed' }]
  }

  return []
}

export function createAgUiAgent(options: CreateAgUiAgentOptions): EdgeAgent {
  const messages: ModelMessage[] = []

  const runAgUi = async function* (input: AgUiRunInput): AsyncGenerator<AgentEvent> {
    let text = ''
    const events = options.run ? await options.run(input) : streamAgUiEndpoint(options, input)

    for await (const event of events) {
      for (const agentEvent of agUiEventToAgentEvents(event)) {
        if (agentEvent.type === 'text-delta') text += agentEvent.text
        yield agentEvent
      }
    }

    if (text) messages.push({ role: 'assistant', content: [{ type: 'text', text }] })
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      messages.push({ role: 'user', content: input })
      yield* runAgUi({ input, messages: [...messages] })
    },
    async *respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent> {
      yield* runAgUi({
        input: '',
        messages: [...messages],
        resume: [{ approvalId, approved, reason }],
      })
    },
    reset() {
      messages.length = 0
    },
  }
}

interface ProviderOptions {
  id: string
  label: string
  resolve(context: ResolveModelContext): Promise<LanguageModelV3 | null>
}

export function createModelProvider(options: ProviderOptions): ModelProvider {
  return {
    id: options.id,
    label: options.label,
    resolve: options.resolve,
  }
}

export async function resolveModel(
  model: Array<ModelProvider | LanguageModelV3>,
  context: ResolveModelContext,
): Promise<ResolvedModel | null> {
  for (const entry of model) {
    if (isModelProvider(entry)) {
      context.emitStatus({
        provider: entry.id,
        status: 'checking',
        message: `Checking ${entry.label}...`,
      })
      const resolved = await withTimeout(entry.resolve(context), context.timeoutMs)
      if (resolved) {
        context.emitStatus({
          provider: entry.id,
          status: 'ready',
          message: `${entry.label} is ready.`,
        })
        return { provider: entry, model: resolved }
      }
      context.emitStatus({
        provider: entry.id,
        status: 'unavailable',
        message: `${entry.label} is not available.`,
      })
      continue
    }

    return {
      provider: createModelProvider({
        id: entry.provider,
        label: entry.provider,
        resolve: async () => entry,
      }),
      model: entry,
    }
  }

  return null
}

export function createAgent(options: CreateAgentOptions): EdgeAgent {
  const downloadPolicy = options.downloadPolicy ?? 'prompt'
  const maxSteps = options.maxSteps ?? 5
  const streamText = options.streamText ?? aiStreamText
  const providers = options.model ?? [chromeAI(), webLLM()]
  const messages: ModelMessage[] = []
  let lastUserInput = ''

  const emitStatus = (event: ModelStatusEvent): ModelStatusEvent => {
    const custom = options.onModelStatus?.(event)
    return custom === null ? event : { ...event, message: custom ?? event.message }
  }

  const requestDownload = async (event: DownloadPromptEvent): Promise<boolean> => {
    if (downloadPolicy === 'auto') return true
    if (downloadPolicy === 'never') return false
    if (options.onDownloadPrompt) return Boolean(await options.onDownloadPrompt(event))
    return false
  }

  const run = async function* (): AsyncGenerator<AgentEvent> {
    const statusEvents: ModelStatusEvent[] = []
    const drainStatus = function* () {
      while (statusEvents.length > 0) {
        yield { type: 'status', event: statusEvents.shift()! } satisfies AgentEvent
      }
    }

    const resolved = await resolveModel(providers, {
      downloadPolicy,
      timeoutMs: options.modelResolveTimeoutMs ?? 3_000,
      emitStatus: event => {
        const displayEvent = emitStatus(event)
        statusEvents.push(displayEvent)
      },
      requestDownload,
    })
    yield* drainStatus()

    if (!resolved) {
      const defaultMessage = 'AI is not available in this browser.'
      const message = options.onNoModel?.({
        availableTools: Object.keys(options.tools),
        input: lastUserInput,
        message: defaultMessage,
      }) ?? defaultMessage
      yield { type: 'no-model', message }
      return
    }

    let text = ''
    const result = (streamText as never as (options: Record<string, unknown>) => ReturnType<StreamTextFn>)({
      model: resolved.model,
      system: options.systemPrompt,
      messages: [...messages],
      tools: options.tools,
      stopWhen: stepCountIs(maxSteps),
    })

    for await (const part of result.fullStream as AsyncIterable<Record<string, unknown>>) {
      yield* drainStatus()
      switch (part.type) {
        case 'text-delta': {
          const delta = String(part.text ?? part.delta ?? '')
          text += delta
          yield { type: 'text-delta', text: delta }
          break
        }
        case 'tool-call':
          yield {
            type: 'tool-call',
            toolName: String(part.toolName),
            toolCallId: String(part.toolCallId),
            input: part.input,
          }
          break
        case 'tool-result':
          yield {
            type: 'tool-result',
            toolName: String(part.toolName),
            toolCallId: String(part.toolCallId),
            output: part.output,
          }
          break
        case 'tool-approval-request':
          yield {
            type: 'approval-request',
            approvalId: String(part.approvalId),
            toolCall: part.toolCall,
          }
          break
        case 'error':
          yield { type: 'error', error: part.error }
          break
      }
    }
    yield* drainStatus()

    const response = await result.response
    messages.push(...response.messages)
    yield { type: 'done', text }
  }

  return {
    async *send(input: string): AsyncGenerator<AgentEvent> {
      lastUserInput = input
      messages.push({ role: 'user', content: input })
      yield* run()
    },
    async *respondToApproval(approvalId: string, approved: boolean, reason?: string): AsyncGenerator<AgentEvent> {
      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool-approval-response',
            approvalId,
            approved,
            reason,
          },
        ],
      })
      yield* run()
    },
    reset() {
      messages.length = 0
    },
  }
}

export function chromeAI(): ModelProvider {
  return createModelProvider({
    id: 'chrome-ai',
    label: 'Chrome AI',
    resolve: async context => {
      try {
        const { browserAI, doesBrowserSupportBrowserAI } = await import('@browser-ai/core')
        if (!doesBrowserSupportBrowserAI()) return null

        const model = browserAI('text')
        const availability = await maybeAvailability(model)
        if (availability === 'unavailable') return null

        if (availability === 'available' || availability === 'readily') {
          return model
        }

        const approved = await context.requestDownload({
          provider: 'chrome-ai',
          message: 'Enable built-in browser AI for smarter answers?',
        })
        if (!approved) return null

        context.emitStatus({
          provider: 'chrome-ai',
          status: 'downloading',
          progress: 0,
          message: 'Preparing Chrome AI...',
        })
        await maybeCreateSessionWithProgress(model, progress => {
          context.emitStatus({
            provider: 'chrome-ai',
            status: 'downloading',
            progress,
            message: `Preparing Chrome AI... ${Math.round(progress * 100)}%`,
          })
        })
        return model
      } catch (error) {
        context.emitStatus({
          provider: 'chrome-ai',
          status: 'error',
          message: readableError(error),
        })
        return null
      }
    },
  })
}

export interface WebLLMOptions {
  model?: string
  modelSize?: string
}

export function webLLM(options: WebLLMOptions = {}): ModelProvider {
  const modelId = options.model ?? 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
  return createModelProvider({
    id: 'webllm',
    label: 'WebLLM',
    resolve: async context => {
      try {
        const { createWebLLM, doesBrowserSupportWebLLM } = await import('@browser-ai/web-llm')
        if (!doesBrowserSupportWebLLM()) return null

        const approved = await context.requestDownload({
          provider: 'webllm',
          modelSize: options.modelSize,
          message: `Download ${options.modelSize ?? 'a local'} AI model for smarter answers?`,
        })
        if (!approved) return null

        const provider = createWebLLM()
        const model = provider(modelId, {
          initProgressCallback: progress => {
            context.emitStatus({
              provider: 'webllm',
              status: 'downloading',
              progress: progress.progress,
              message: progress.text ?? `Downloading WebLLM... ${Math.round(progress.progress * 100)}%`,
            })
          },
        })
        return model
      } catch (error) {
        context.emitStatus({
          provider: 'webllm',
          status: 'error',
          message: readableError(error),
        })
        return null
      }
    },
  })
}

function isModelProvider(value: ModelProvider | LanguageModelV3): value is ModelProvider {
  return 'resolve' in value && typeof value.resolve === 'function'
}

function normalizeAgUiType(type: string) {
  return type
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase()
}

async function* streamAgUiEndpoint(options: CreateAgUiAgentOptions, input: AgUiRunInput): AsyncGenerator<AgUiEvent> {
  if (!options.endpoint) throw new Error('createAgUiAgent requires either endpoint or run.')
  const fetchImpl = options.fetch ?? fetch
  const response = await fetchImpl(options.endpoint, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream, application/x-ndjson, application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(`AG-UI endpoint failed with ${response.status}`)
  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const event = parseAgUiLine(line)
      if (event) yield event
    }
  }

  const lastEvent = parseAgUiLine(buffer)
  if (lastEvent) yield lastEvent
}

function parseAgUiLine(line: string): AgUiEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed === 'data: [DONE]') return null
  const payload = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
  if (!payload) return null

  try {
    const event = JSON.parse(payload)
    return isRecord(event) && typeof event.type === 'string' ? event as AgUiEvent : null
  } catch {
    return null
  }
}

async function maybeAvailability(model: unknown): Promise<string | undefined> {
  if (typeof model === 'object' && model && 'availability' in model) {
    const availability = (model as { availability: () => Promise<string> }).availability
    if (typeof availability === 'function') return availability.call(model)
  }
  return undefined
}

async function maybeCreateSessionWithProgress(
  model: unknown,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (typeof model === 'object' && model && 'createSessionWithProgress' in model) {
    const createSessionWithProgress = (
      model as { createSessionWithProgress: (onProgress: (progress: number) => void) => Promise<unknown> }
    ).createSessionWithProgress
    if (typeof createSessionWithProgress === 'function') {
      await createSessionWithProgress.call(model, onProgress)
    }
  }
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined): Promise<T | null> {
  if (!timeoutMs) return promise

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
