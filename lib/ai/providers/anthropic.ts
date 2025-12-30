// @ts-ignore - Optional provider, package may not be installed
import Anthropic from '@anthropic-ai/sdk'
import type { LLMMessage, LLMResponse } from '../llm-service'

export async function generateAnthropicResponse(
  client: Anthropic,
  messages: LLMMessage[],
  model: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  const systemMessage = messages.find(m => m.role === 'system')
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    })) as Array<{ role: 'user' | 'assistant'; content: string }>

  const response = await client.messages.create({
    model: model as any,
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature || 0.7,
    system: systemMessage?.content,
    messages: conversationMessages
  })

  const content = response.content[0].type === 'text' 
    ? response.content[0].text 
    : ''

  return {
    content,
    model,
    provider: 'anthropic' as const,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens
    }
  }
}


























