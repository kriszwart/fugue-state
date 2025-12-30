import { HuggingFaceLLM } from './providers/huggingface'
import { VertexGeminiLLM } from './providers/vertex'
import { EnhancedVertexGeminiLLM } from './providers/vertex-enhanced'

export type LLMProvider = 'huggingface' | 'vertex' | 'anthropic' | 'google' | 'openai'
export type LLMModel = string // Model names (provider-specific)

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  model: string
  provider: LLMProvider
  thinking?: string // For thinking mode
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    cachedTokens?: number // For context caching
  }
}

export interface LLMServiceConfig {
  provider: LLMProvider
  huggingfaceApiKey?: string
  vertexProjectId?: string
  vertexLocation?: string
}

class LLMService {
  private provider: LLMProvider
  private huggingface: HuggingFaceLLM | null = null
  private vertex: VertexGeminiLLM | null = null
  private enhancedVertex: EnhancedVertexGeminiLLM | null = null
  private useEnhanced: boolean = false

  constructor(config: LLMServiceConfig) {
    this.provider = config.provider

    if (config.provider === 'huggingface' && config.huggingfaceApiKey) {
      this.huggingface = new HuggingFaceLLM({ apiKey: config.huggingfaceApiKey })
    } else if (config.provider === 'vertex') {
      // Check if enhanced features are enabled
      this.useEnhanced = process.env.ENABLE_THINKING_MODE === 'true' ||
                         process.env.ENABLE_CONTEXT_CACHING === 'true' ||
                         process.env.ENABLE_EXTENDED_CONTEXT === 'true'

      if (this.useEnhanced) {
        console.log('[LLM Service] Using enhanced Vertex provider with thinking mode & caching')
        this.enhancedVertex = new EnhancedVertexGeminiLLM({
          projectId: config.vertexProjectId!,
          location: config.vertexLocation || 'us-central1',
          serviceAccountKey: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          enableCaching: process.env.ENABLE_CONTEXT_CACHING === 'true',
          enableThinking: process.env.ENABLE_THINKING_MODE === 'true',
          enableMultimodal: process.env.ENABLE_MULTIMODAL === 'true'
        })
      } else {
        this.vertex = new VertexGeminiLLM({
          projectId: config.vertexProjectId!,
          location: config.vertexLocation || 'us-central1',
          serviceAccountKey: process.env.GOOGLE_APPLICATION_CREDENTIALS
        })
      }
    }
  }

  async generateResponse(
    messages: LLMMessage[],
    options?: {
      model?: LLMModel
      modelType?: 'thinking' | 'chat' | 'auto'
      temperature?: number
      maxTokens?: number
      stream?: boolean
      useThinking?: boolean // Enable thinking mode
      cachedContext?: string // Use cached context
      systemPrompt?: string // Custom system prompt (for muse personalities)
    }
  ): Promise<LLMResponse> {
    // Prepend system prompt if provided
    const effectiveMessages = options?.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
      : messages

    if (this.provider === 'vertex') {
      // Use enhanced provider if available and thinking/caching requested
      if (this.enhancedVertex && (options?.useThinking || options?.cachedContext || this.useEnhanced)) {
        try {
          console.log('[LLM Service] Using enhanced Vertex with thinking:', options?.useThinking, 'cached:', !!options?.cachedContext)
          const response = await this.enhancedVertex.generateWithThinking(
            effectiveMessages,
            {
              model: options?.model,
              temperature: options?.temperature,
              maxTokens: options?.maxTokens,
              useThinking: options?.useThinking || (options?.modelType === 'thinking'),
              cachedContext: options?.cachedContext
            }
          )
          return {
            content: response.content,
            model: response.model,
            provider: 'vertex',
            thinking: response.thinking,
            usage: response.usage
          }
        } catch (error: any) {
          console.error('[LLM Service] Enhanced Vertex error:', error.message)
          throw new Error(`Vertex AI request failed: ${error.message}. Please check your GCP credentials and project configuration.`)
        }
      }

      // Fallback to standard vertex
      if (!this.vertex && !this.enhancedVertex) {
        const errorMsg = 'Vertex AI not configured. Please set VERTEX_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS environment variables.'
        console.error('[LLM Service]', errorMsg)
        throw new Error(errorMsg)
      }
      try {
        const vertexInstance = (this.vertex || this.enhancedVertex) as VertexGeminiLLM
        return await vertexInstance.generateResponse(
          effectiveMessages,
          {
            model: options?.model,
            modelType: options?.modelType || 'auto',
            temperature: options?.temperature,
            maxTokens: options?.maxTokens
          }
        )
      } catch (error: any) {
        console.error('[LLM Service] Vertex AI error:', error.message)
        throw new Error(`Vertex AI request failed: ${error.message}. Please check your GCP credentials and project configuration.`)
      }
    } else {
      if (!this.huggingface) {
        const errorMsg = 'Hugging Face API key not configured. Please set HUGGINGFACE_API_KEY environment variable.'
        console.error('[LLM Service]', errorMsg)
        throw new Error(errorMsg)
      }
      try {
        return await this.huggingface.generateResponse(
          effectiveMessages,
          {
            model: options?.model,
            modelType: options?.modelType || 'auto',
            temperature: options?.temperature,
            maxTokens: options?.maxTokens
          }
        )
      } catch (error: any) {
        console.error('[LLM Service] HuggingFace error:', error.message)
        throw new Error(`HuggingFace request failed: ${error.message}. Please check your API key.`)
      }
    }
  }

  async *generateStreamingResponse(
    messages: LLMMessage[],
    options?: {
      model?: LLMModel
      modelType?: 'thinking' | 'chat' | 'auto'
      temperature?: number
      maxTokens?: number
      systemPrompt?: string
    }
  ): AsyncGenerator<{ content: string; done: boolean; model?: string }> {
    // Prepend system prompt if provided
    const effectiveMessages = options?.systemPrompt
      ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
      : messages
    if (this.provider === 'vertex') {
      if (!this.vertex) {
        throw new Error('Vertex AI not configured')
      }
      yield* this.vertex.generateStreamingResponse(
        effectiveMessages,
        {
          model: options?.model,
          modelType: options?.modelType || 'auto',
          temperature: options?.temperature,
          maxTokens: options?.maxTokens
        }
      )
    } else {
      if (!this.huggingface) {
        throw new Error('Hugging Face API key not configured')
      }
      yield* this.huggingface.generateStreamingResponse(
        effectiveMessages,
        {
          model: options?.model,
          modelType: options?.modelType || 'auto',
          temperature: options?.temperature,
          maxTokens: options?.maxTokens
        }
      )
    }
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    const provider = (process.env.LLM_PROVIDER || 'huggingface') as LLMProvider

    llmServiceInstance = new LLMService({
      provider,
      huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
      vertexProjectId: process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID,
      vertexLocation: process.env.VERTEX_LOCATION || 'us-central1'
    })
  }
  return llmServiceInstance
}

export default LLMService
