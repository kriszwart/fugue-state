import { VertexAI } from '@google-cloud/vertexai'

export interface ImageGenerationOptions {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  numberOfImages?: number
  seed?: number
}

export interface GeneratedImage {
  image: Blob
  url?: string
  metadata: {
    model: string
    prompt: string
    options: ImageGenerationOptions
  }
}

// Vertex AI Imagen models
export const VERTEX_IMAGE_MODELS = [
  'imagegeneration@006', // Imagen 3 - Latest and best
  'imagegeneration@005', // Imagen 2 - Fallback
  'imagegeneration@002', // Imagen 1 - Backup
]

export class VertexImageGenerationService {
  private vertexAI: VertexAI
  private projectId: string
  private location: string

  constructor(projectId: string, location: string = 'us-central1') {
    this.projectId = projectId
    this.location = location
    this.vertexAI = new VertexAI({
      project: projectId,
      location: location
    })
  }

  async generateImage(
    options: ImageGenerationOptions,
    modelVersion?: string
  ): Promise<GeneratedImage> {
    const model = modelVersion || VERTEX_IMAGE_MODELS[0]

    try {
      console.log(`[Vertex Image] Generating with model: ${model}`)

      // Get the generative model
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: model,
      })

      // Prepare the prompt
      const prompt = options.negativePrompt
        ? `${options.prompt}. Negative prompt: ${options.negativePrompt}`
        : options.prompt

      // Generate image
      const request = {
        contents: [{
          role: 'user',
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          candidateCount: options.numberOfImages || 1,
        }
      }

      const result = await generativeModel.generateContent(request)
      const response = result.response

      // Extract image data from response
      // Vertex AI Imagen returns base64 encoded images
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0]

        // Look for image data in the response
        let imageData: string | null = null

        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if ((part as any).inlineData?.data) {
              imageData = (part as any).inlineData.data
              break
            }
          }
        }

        if (!imageData) {
          throw new Error('No image data in response')
        }

        // Convert base64 to Blob
        const binaryString = atob(imageData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'image/png' })

        console.log(`[Vertex Image] Success with model: ${model}`)

        return {
          image: blob,
          metadata: {
            model: `vertex-${model}`,
            prompt: options.prompt,
            options
          }
        }
      }

      throw new Error('No candidates in response')
    } catch (error: any) {
      console.error(`[Vertex Image] Error with model ${model}:`, error.message)
      throw new Error(`Vertex AI image generation failed: ${error.message}`)
    }
  }

  async generateImageWithFallback(
    options: ImageGenerationOptions
  ): Promise<GeneratedImage> {
    let lastError: Error | null = null

    // Try each Imagen model in sequence
    for (const model of VERTEX_IMAGE_MODELS) {
      try {
        return await this.generateImage(options, model)
      } catch (error: any) {
        console.error(`[Vertex Image] Model ${model} failed, trying next...`)
        lastError = error
        continue
      }
    }

    throw new Error(
      `All Vertex AI image models failed. Last error: ${lastError?.message || 'Unknown error'}`
    )
  }
}

export function getVertexImageService(): VertexImageGenerationService {
  const projectId = process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID
  const location = process.env.VERTEX_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

  if (!projectId) {
    throw new Error('VERTEX_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID environment variable is required')
  }

  return new VertexImageGenerationService(projectId, location)
}
