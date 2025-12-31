export interface VertexConfig {
  projectId: string
  location: string
  serviceAccountKey?: string // Path to service account JSON file (for local dev)
  // For Cloud Run, we use Application Default Credentials
  // No API key needed when running on GCP
}

export interface VertexModel {
  name: string
  category: 'thinking' | 'chat'
}

// Gemini models available on Vertex AI
export const VERTEX_MODELS: VertexModel[] = [
  { name: 'gemini-1.5-pro-002', category: 'thinking' },
  { name: 'gemini-1.5-flash-002', category: 'chat' },
  { name: 'gemini-2.0-flash-exp', category: 'chat' }
]

export class VertexGeminiLLM {
  private projectId: string
  private location: string
  private serviceAccountKey?: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(config: VertexConfig) {
    this.projectId = config.projectId
    this.location = config.location
    this.serviceAccountKey = config.serviceAccountKey
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
    provider: 'vertex'
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
  }> {
    // Select model
    const modelName = this.selectModel(options?.model, options?.modelType)

    // Ensure we have a valid access token
    await this.ensureAccessToken()

    // Format messages for Gemini API
    const { contents, systemInstruction } = this.formatMessages(messages)

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:generateContent`

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      }
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
      console.error('Vertex AI API error:', error)
      throw new Error(`Vertex AI API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Extract response
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

  async *generateStreamingResponse(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      model?: string
      modelType?: 'thinking' | 'chat' | 'auto'
      temperature?: number
      maxTokens?: number
    }
  ): AsyncGenerator<{ content: string; done: boolean; model?: string }> {
    // Select model
    const modelName = this.selectModel(options?.model, options?.modelType)

    // Ensure we have a valid access token
    await this.ensureAccessToken()

    // Format messages for Gemini API
    const { contents, systemInstruction } = this.formatMessages(messages)

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:streamGenerateContent`

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 2048,
      }
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
      console.error('Vertex AI streaming error:', error)
      throw new Error(`Vertex AI streaming error: ${response.statusText}`)
    }

    // Process streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6)
            try {
              const data = JSON.parse(jsonStr)
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                yield { content: text, done: false, model: modelName }
              }
            } catch (e) {
              // Skip malformed JSON
              continue
            }
          }
        }
      }

      yield { content: '', done: true, model: modelName }
    } finally {
      reader.releaseLock()
    }
  }

  private selectModel(model?: string, modelType?: 'thinking' | 'chat' | 'auto'): string {
    if (model) {
      return model
    }

    if (modelType === 'thinking') {
      return process.env.GEMINI_THINKING_MODEL || 'gemini-2.0-flash-exp'
    } else if (modelType === 'chat') {
      return process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp'
    } else {
      // Auto: use flash for speed
      return process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp'
    }
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
    // Check if token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return
    }

    // Try JSON credentials from environment variable (for Vercel/production)
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson)

        // Use service account JWT to get access token
        const now = Math.floor(Date.now() / 1000)
        const jwtPayload = {
          iss: credentials.client_email,
          sub: credentials.client_email,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600
        }

        // Create JWT
        const { sign } = await import('jsonwebtoken')
        const jwt = sign(jwtPayload, credentials.private_key, { algorithm: 'RS256' })

        // Exchange JWT for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
          })
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          throw new Error(`Token exchange failed: ${errorText}`)
        }

        const tokenData = await tokenResponse.json()
        this.accessToken = tokenData.access_token
        this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000)
        console.log('[Vertex] Successfully authenticated with service account JWT')
        return
      } catch (error) {
        console.error('Failed to get access token from JSON credentials:', error)
        throw new Error(`Failed to authenticate with service account JSON: ${error}`)
      }
    }

    // Try service account authentication from file (for local development)
    if (this.serviceAccountKey) {
      try {
        const { GoogleAuth } = await import('google-auth-library')
        const auth = new GoogleAuth({
          keyFilename: this.serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        })
        const client = await auth.getClient()
        const tokenResponse = await client.getAccessToken()
        if (tokenResponse.token) {
          this.accessToken = tokenResponse.token
          this.tokenExpiry = Date.now() + (3600 * 1000) // 1 hour
          return
        }
      } catch (error) {
        console.error('Failed to get access token from service account:', error)
        throw new Error('Failed to authenticate with service account key')
      }
    }

    // Fall back to metadata server (works on Cloud Run)
    try {
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        {
          headers: {
            'Metadata-Flavor': 'Google'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to get access token from metadata server')
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in * 1000)
    } catch (error) {
      console.error('Failed to get access token:', error)
      throw new Error('Failed to authenticate with Vertex AI. Ensure running on Google Cloud or provide service account key.')
    }
  }
}

export function getVertexGeminiLLM(): VertexGeminiLLM {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID environment variable is required')
  }

  return new VertexGeminiLLM({
    projectId,
    location,
    serviceAccountKey
  })
}
