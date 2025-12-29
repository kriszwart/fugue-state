import OpenAI from 'openai'
import type { LLMMessage, LLMResponse } from '../llm-service'

export async function generateOpenAIResponse(
  client: OpenAI,
  messages: LLMMessage[],
  model: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  const response = await client.chat.completions.create({
    model: model as any,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    })) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 1024
  })

  const content = response.choices[0]?.message?.content || ''

  return {
    content,
    model,
    provider: 'openai',
    usage: {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens
    }
  }
}
























