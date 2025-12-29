import { HfInference } from '@huggingface/inference'

export interface HuggingFaceConfig {
  apiKey: string
}

export interface HuggingFaceModel {
  name: string
  type: 'text-generation' | 'text2text-generation' | 'conversational'
  category: 'thinking' | 'chat' | 'generation'
}

// Thinking/Reasoning Models - For memory analysis, pattern detection, deep reasoning
// These models excel at understanding context, making connections, and analytical thinking
export const THINKING_MODELS: HuggingFaceModel[] = [
  { name: 'meta-llama/Llama-3.1-70B-Instruct', type: 'text-generation', category: 'thinking' },
  { name: 'Qwen/Qwen2.5-72B-Instruct', type: 'text-generation', category: 'thinking' },
  { name: 'mistralai/Mixtral-8x7B-Instruct-v0.1', type: 'text-generation', category: 'thinking' },
  { name: 'deepseek-ai/DeepSeek-Coder-33B-instruct', type: 'text-generation', category: 'thinking' },
  { name: 'meta-llama/Llama-3.1-8B-Instruct', type: 'text-generation', category: 'thinking' }
]

// Chat Models - For conversational responses, empathetic dialogue
// These models are optimized for natural, engaging conversations
export const CHAT_MODELS: HuggingFaceModel[] = [
  { name: 'meta-llama/Llama-3.1-8B-Instruct', type: 'text-generation', category: 'chat' },
  { name: 'mistralai/Mistral-7B-Instruct-v0.2', type: 'text-generation', category: 'chat' },
  { name: 'Qwen/Qwen2.5-7B-Instruct', type: 'text-generation', category: 'chat' },
  { name: 'google/gemma-2-9b-it', type: 'text-generation', category: 'chat' },
  { name: 'microsoft/Phi-3-mini-4k-instruct', type: 'text-generation', category: 'chat' }
]

// All models combined (for backward compatibility)
export const HUGGINGFACE_MODELS: HuggingFaceModel[] = [
  ...THINKING_MODELS,
  ...CHAT_MODELS
]

export class HuggingFaceLLM {
  private client: HfInference
  private thinkingModels: HuggingFaceModel[]
  private chatModels: HuggingFaceModel[]
  private allModels: HuggingFaceModel[]

  constructor(config: HuggingFaceConfig) {
    this.client = new HfInference(config.apiKey)
    this.thinkingModels = THINKING_MODELS
    this.chatModels = CHAT_MODELS
    this.allModels = HUGGINGFACE_MODELS
  }

  async generateResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      model?: string
      modelType?: 'thinking' | 'chat' | 'auto'
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{
    content: string
    model: string
    provider: 'huggingface'
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
  }> {
    // Select model based on type
    let selectedModel: string
    let modelConfig: HuggingFaceModel

    if (options?.model) {
      selectedModel = options.model
      modelConfig = this.allModels.find(m => m.name === selectedModel) || this.chatModels[0]
    } else if (options?.modelType === 'thinking') {
      modelConfig = this.selectRandomModelFromCategory('thinking')
      selectedModel = modelConfig.name
    } else if (options?.modelType === 'chat') {
      modelConfig = this.selectRandomModelFromCategory('chat')
      selectedModel = modelConfig.name
    } else {
      // Auto: use chat models for conversation
      modelConfig = this.selectRandomModelFromCategory('chat')
      selectedModel = modelConfig.name
    }

    // Format messages for the model
    const prompt = this.formatMessages(messages, modelConfig)

    try {
      let response: string

      if (modelConfig.type === 'text-generation') {
        const result = await this.client.textGeneration({
          model: selectedModel,
          inputs: prompt,
          parameters: {
            temperature: options?.temperature || 0.7,
            max_new_tokens: options?.maxTokens || 512,
            return_full_text: false
          }
        })

        response = result.generated_text || ''
      } else if (modelConfig.type === 'text2text-generation') {
        const result = await this.client.textToText({
          model: selectedModel,
          inputs: prompt,
          parameters: {
            temperature: options?.temperature || 0.7,
            max_new_tokens: options?.maxTokens || 512
          }
        })

        response = Array.isArray(result) ? result[0]?.generated_text || '' : result.generated_text || ''
      } else {
        // Conversational
        const result = await this.client.conversational({
          model: selectedModel,
          inputs: {
            past_user_inputs: messages
              .filter(m => m.role === 'user')
              .slice(0, -1)
              .map(m => m.content),
            generated_responses: messages
              .filter(m => m.role === 'assistant')
              .map(m => m.content),
            text: messages[messages.length - 1].content
          },
          parameters: {
            temperature: options?.temperature || 0.7,
            max_length: options?.maxTokens || 512
          }
        })

        response = result.generated_text || ''
      }

      // Estimate token usage (rough: 1 token ≈ 4 characters)
      const promptTokens = Math.ceil(prompt.length / 4)
      const completionTokens = Math.ceil(response.length / 4)

      return {
        content: response.trim(),
        model: selectedModel,
        provider: 'huggingface',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        }
      }
    } catch (error: any) {
      console.error('Hugging Face API error:', error)
      throw new Error(`Hugging Face API error: ${error.message}`)
    }
  }

  async *generateStreamingResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      model?: string
      modelType?: 'thinking' | 'chat' | 'auto'
      temperature?: number
      maxTokens?: number
    }
  ): AsyncGenerator<{ content: string; done: boolean; model?: string }> {
    // Select model based on type
    let selectedModel: string
    let modelConfig: HuggingFaceModel

    if (options?.model) {
      selectedModel = options.model
      modelConfig = this.allModels.find(m => m.name === selectedModel) || this.chatModels[0]
    } else if (options?.modelType === 'thinking') {
      modelConfig = this.selectRandomModelFromCategory('thinking')
      selectedModel = modelConfig.name
    } else if (options?.modelType === 'chat') {
      modelConfig = this.selectRandomModelFromCategory('chat')
      selectedModel = modelConfig.name
    } else {
      modelConfig = this.selectRandomModelFromCategory('chat')
      selectedModel = modelConfig.name
    }

    // Format messages for the model
    const prompt = this.formatMessages(messages, modelConfig)

    try {
      // Only text-generation models support streaming
      if (modelConfig.type === 'text-generation') {
        const stream = this.client.textGenerationStream({
          model: selectedModel,
          inputs: prompt,
          parameters: {
            temperature: options?.temperature || 0.7,
            max_new_tokens: options?.maxTokens || 512,
            return_full_text: false
          }
        })

        for await (const chunk of stream) {
          if (chunk.token && chunk.token.text) {
            yield {
              content: chunk.token.text,
              done: false,
              model: selectedModel
            }
          }
        }

        yield { content: '', done: true, model: selectedModel }
      } else {
        // Fallback to non-streaming for other model types
        const result = await this.generateResponse(messages, options)
        yield { content: result.content, done: true, model: result.model }
      }
    } catch (error: any) {
      console.error('Hugging Face streaming error:', error)
      throw new Error(`Hugging Face streaming error: ${error.message}`)
    }
  }

  private selectRandomModel(): string {
    return this.chatModels[Math.floor(Math.random() * this.chatModels.length)].name
  }

  private selectRandomModelFromCategory(category: 'thinking' | 'chat'): HuggingFaceModel {
    const models = category === 'thinking' ? this.thinkingModels : this.chatModels
    return models[Math.floor(Math.random() * models.length)]
  }

  // Get thinking model for memory analysis
  getThinkingModel(): HuggingFaceModel {
    return this.selectRandomModelFromCategory('thinking')
  }

  // Get chat model for conversations
  getChatModel(): HuggingFaceModel {
    return this.selectRandomModelFromCategory('chat')
  }

  private formatMessages(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    modelConfig: HuggingFaceModel
  ): string {
    // Format messages based on model requirements
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    let prompt = ''

    if (systemMessage) {
      prompt += `System: ${systemMessage.content}\n\n`
    }

    // Format conversation
    for (const message of conversationMessages) {
      if (message.role === 'user') {
        prompt += `User: ${message.content}\n\n`
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`
      }
    }

    prompt += 'Assistant:'

    return prompt
  }
}

export function getHuggingFaceLLM(): HuggingFaceLLM {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY environment variable is required')
  }
  return new HuggingFaceLLM({ apiKey })
}

