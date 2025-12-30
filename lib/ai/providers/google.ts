// @ts-ignore - Optional provider, package may not be installed
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMMessage, LLMResponse } from '../llm-service'

export async function generateGoogleResponse(
  client: GoogleGenerativeAI,
  messages: LLMMessage[],
  model: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  const genModel = client.getGenerativeModel({ 
    model: model === 'gemini-pro-vision' ? 'gemini-pro-vision' : 'gemini-pro'
  })

  // Convert messages to Google format (last user message + context)
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  const context = messages
    .filter(m => m.role !== 'user' || m === lastUserMessage)
    .map(m => {
      if (m.role === 'user') return `User: ${m.content}`
      if (m.role === 'assistant') return `Assistant: ${m.content}`
      return m.content
    })
    .join('\n\n')

  const result = await genModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: context }] }],
    generationConfig: {
      temperature: options?.temperature || 0.7,
      maxOutputTokens: options?.maxTokens || 1024
    }
  })

  const content = result.response.text()

  return {
    content,
    model,
    provider: 'google' as const
  }
}

























