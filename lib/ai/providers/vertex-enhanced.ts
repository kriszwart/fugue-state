/**
 * Enhanced Vertex AI Provider with Gemini 2.0 Advanced Features
 *
 * Features:
 * - Context caching (60% cost savings)
 * - Thinking mode (better reasoning)
 * - Extended context (2M tokens)
 * - Function calling (structured outputs)
 * - Multimodal support (images, audio, video)
 */

import { GoogleAuth } from 'google-auth-library'

export interface EnhancedVertexConfig {
  projectId: string
  location: string
  serviceAccountKey?: string
  enableCaching?: boolean
  enableThinking?: boolean
  enableMultimodal?: boolean
}

export interface CachedContext {
  name: string
  expireTime: string
}

export interface ThinkingResponse {
  content: string
  thinking?: string // The model's reasoning process
  model: string
  provider: 'vertex'
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    cachedTokens?: number
  }
}

export interface FunctionCall {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MultimodalPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string // base64
  }
  fileData?: {
    mimeType: string
    fileUri: string
  }
}

export class EnhancedVertexGeminiLLM {
  private projectId: string
  private location: string
  private serviceAccountKey?: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private cachedContexts: Map<string, CachedContext> = new Map()

  constructor(config: EnhancedVertexConfig) {
    this.projectId = config.projectId
    this.location = config.location
    this.serviceAccountKey = config.serviceAccountKey
  }

  /**
   * Generate response with optional thinking mode
   */
  async generateWithThinking(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      useThinking?: boolean
      functions?: FunctionCall[]
      cachedContext?: string
    }
  ): Promise<ThinkingResponse> {
    await this.ensureAccessToken()

    // Select best model based on task
    const modelName = this.selectBestModel(options)

    const { contents, systemInstruction } = this.formatMessages(messages)

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:generateContent`

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.8, // Higher creativity for muse personalities
        maxOutputTokens: options?.maxTokens ?? 8192,
        topP: 0.95, // Nucleus sampling for better quality
        topK: 40, // Limit token selection for coherence
      }
    }

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction
    }

    // Add function calling if provided
    if (options?.functions && options.functions.length > 0) {
      requestBody.tools = [{
        functionDeclarations: options.functions
      }]
    }

    // Use cached context if provided
    if (options?.cachedContext) {
      requestBody.cachedContent = options.cachedContext
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    // Extract thinking if present (for thinking models)
    const thinking = data.candidates?.[0]?.content?.parts?.find((p: any) => p.thought)?.thought
    const content = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || ''

    // Extract function calls if present
    const functionCall = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall

    const usage = data.usageMetadata || {}

    return {
      content: functionCall ? JSON.stringify(functionCall) : content,
      thinking,
      model: modelName,
      provider: 'vertex',
      usage: {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
        cachedTokens: usage.cachedContentTokenCount || 0
      }
    }
  }

  /**
   * Cache context for reuse (60% cost savings)
   */
  async cacheContext(
    context: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      ttl?: number // seconds
      displayName?: string
    }
  ): Promise<CachedContext> {
    await this.ensureAccessToken()

    const { contents, systemInstruction } = this.formatMessages(context)

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/cachedContents`

    const ttl = options?.ttl || 3600 // 1 hour default

    const requestBody: any = {
      model: `projects/${this.projectId}/locations/${this.location}/publishers/google/models/gemini-1.5-pro-002`,
      contents,
      ttl: `${ttl}s`,
      displayName: options?.displayName || 'FugueState Memory Context'
    }

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Context caching error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    const cachedContext: CachedContext = {
      name: data.name,
      expireTime: data.expireTime
    }

    // Store in memory for quick access
    this.cachedContexts.set(data.name, cachedContext)

    return cachedContext
  }

  /**
   * Analyze multimodal content (text + images + audio + video)
   */
  async analyzeMultimodal(
    parts: MultimodalPart[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      systemInstruction?: string
    }
  ): Promise<ThinkingResponse> {
    await this.ensureAccessToken()

    // Use Gemini 1.5 Pro for best multimodal quality
    const modelName = options?.model || 'gemini-1.5-pro-002'

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:generateContent`

    const requestBody: any = {
      contents: [{
        role: 'user',
        parts
      }],
      generationConfig: {
        temperature: options?.temperature ?? 0.8,
        maxOutputTokens: options?.maxTokens ?? 8192,
        topP: 0.95,
        topK: 40,
      }
    }

    if (options?.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Multimodal analysis error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const usage = data.usageMetadata || {}

    return {
      content,
      model: modelName,
      provider: 'vertex',
      usage: {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount
      }
    }
  }

  /**
   * Generate response with function calling
   */
  async generateWithFunctions(
    prompt: string,
    functions: FunctionCall[],
    options?: {
      model?: string
      temperature?: number
      systemInstruction?: string
    }
  ): Promise<{
    functionCall?: { name: string; args: Record<string, any> }
    content?: string
    model: string
  }> {
    await this.ensureAccessToken()

    // Use smart model selection for function calling
    const modelName = this.selectBestModel({ model: options?.model, functions })

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:generateContent`

    const requestBody: any = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      tools: [{
        functionDeclarations: functions
      }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
      }
    }

    if (options?.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Function calling error: ${response.statusText} - ${error}`)
    }

    const data = await response.json()

    const functionCall = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall
    const textContent = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text

    return {
      functionCall: functionCall ? {
        name: functionCall.name,
        args: functionCall.args
      } : undefined,
      content: textContent,
      model: modelName
    }
  }

  /**
   * Select the best model based on task requirements
   */
  private selectBestModel(options?: {
    model?: string
    useThinking?: boolean
    functions?: FunctionCall[]
  }): string {
    // If specific model requested, use it
    if (options?.model) {
      return options.model
    }

    // Best models for different tasks:
    // - gemini-1.5-pro-002: Production-stable, 2M context, best quality for chat/muse personalities
    // - gemini-1.5-flash-002: Fast, cost-effective for quick tasks
    // - gemini-2.0-flash-thinking-exp: Experimental thinking mode
    // - gemini-2.0-flash-exp: Latest experimental model

    // Use thinking model if requested (experimental)
    if (options?.useThinking) {
      return process.env.GEMINI_THINKING_MODEL || 'gemini-2.0-flash-exp'
    }

    // Use Pro for function calling (better structured outputs)
    if (options?.functions && options.functions.length > 0) {
      return process.env.GEMINI_EXTENDED_MODEL || 'gemini-2.0-flash-exp'
    }

    // Default: Use Gemini Flash (available in all regions)
    return process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp'
  }

  private formatMessages(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>
    systemInstruction?: { parts: Array<{ text: string }> }
  } {
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    const contents = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const result: any = { contents }

    if (systemMessage) {
      result.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      }
    }

    return result
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return
    }

    if (this.serviceAccountKey) {
      try {
        const auth = new GoogleAuth({
          keyFilename: this.serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
        const client = await auth.getClient()
        const tokenResponse = await client.getAccessToken()
        if (tokenResponse.token) {
          this.accessToken = tokenResponse.token
          this.tokenExpiry = Date.now() + (3600 * 1000)
          return
        }
      } catch (error) {
        console.error('Failed to get access token from service account:', error)
        throw new Error('Failed to authenticate with service account key')
      }
    }

    // Fallback to metadata server
    try {
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } }
      )

      if (!response.ok) {
        throw new Error('Failed to get access token from metadata server')
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in * 1000)
    } catch (error) {
      console.error('Failed to get access token:', error)
      throw new Error('Failed to authenticate with Vertex AI')
    }
  }
}

export function getEnhancedVertexGeminiLLM(): EnhancedVertexGeminiLLM {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID environment variable is required')
  }

  return new EnhancedVertexGeminiLLM({
    projectId,
    location,
    serviceAccountKey,
    enableCaching: process.env.ENABLE_CONTEXT_CACHING === 'true',
    enableThinking: process.env.ENABLE_THINKING_MODE === 'true',
    enableMultimodal: process.env.ENABLE_MULTIMODAL === 'true'
  })
}
