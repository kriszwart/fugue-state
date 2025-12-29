import { HfInference } from '@huggingface/inference'
import { getVertexImageService, VertexImageGenerationService } from './vertex-image-service'

export interface ImageGenerationOptions {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  numInferenceSteps?: number
  guidanceScale?: number
  seed?: number
  numberOfImages?: number
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

// Best Hugging Face image generation models (free, publicly available)
// Top tier models for high-quality generation
export const PREMIUM_IMAGE_MODELS = [
  'stabilityai/stable-diffusion-xl-base-1.0', // SDXL - excellent quality, free
  'runwayml/stable-diffusion-v1-5', // SD 1.5 - reliable and free
  'stabilityai/stable-diffusion-2-1', // SD 2.1 - good quality, free
]

// Standard quality models (faster, good quality, all free)
export const STANDARD_IMAGE_MODELS = [
  'runwayml/stable-diffusion-v1-5',
  'CompVis/stable-diffusion-v1-4',
  'prompthero/openjourney-v4', // Midjourney-like style, free
]

// All image models combined
export const IMAGE_MODELS = [
  ...PREMIUM_IMAGE_MODELS,
  ...STANDARD_IMAGE_MODELS
]

export class ImageGenerationService {
  private client: HfInference
  private defaultModel: string

  constructor(apiKey: string, defaultModel?: string) {
    this.client = new HfInference(apiKey)
    this.defaultModel = defaultModel || IMAGE_MODELS[0]
  }

  async generateImage(
    options: ImageGenerationOptions,
    model?: string,
    usePremium: boolean = true
  ): Promise<GeneratedImage> {
    const modelsToTry = model
      ? [model]
      : usePremium
        ? [...PREMIUM_IMAGE_MODELS]
        : [...STANDARD_IMAGE_MODELS]

    let lastError: Error | null = null

    // Try each model in sequence until one works
    for (const selectedModel of modelsToTry) {
      try {
        console.log(`[Image Gen] Trying model: ${selectedModel}`)

        const result = await this.client.textToImage({
          model: selectedModel,
          inputs: options.prompt,
          parameters: {
            negative_prompt: options.negativePrompt,
            width: options.width || 512,
            height: options.height || 512,
            num_inference_steps: options.numInferenceSteps || 50,
            guidance_scale: options.guidanceScale || 7.5,
            seed: options.seed
          }
        })

        // Hugging Face returns a Blob directly
        const blob = result instanceof Blob ? result : new Blob([result], { type: 'image/png' })

        console.log(`[Image Gen] Success with model: ${selectedModel}`)
        return {
          image: blob,
          metadata: {
            model: selectedModel,
            prompt: options.prompt,
            options
          }
        }
      } catch (error: any) {
        console.error(`[Image Gen] Model ${selectedModel} failed:`, error.message)
        lastError = error
        // Continue to next model
        continue
      }
    }

    // All models failed
    throw new Error(`Image generation failed with all available models. Last error: ${lastError?.message || 'Unknown error'}`)
  }

  async generateImageFromMemory(
    memoryDescription: string,
    style?: string
  ): Promise<GeneratedImage> {
    const prompt = style
      ? `${memoryDescription}, ${style}`
      : memoryDescription

    return this.generateImage({
      prompt,
      width: 1024,
      height: 1024,
      numInferenceSteps: 50,
      guidanceScale: 7.5
    })
  }

  private selectRandomModel(): string {
    return IMAGE_MODELS[Math.floor(Math.random() * IMAGE_MODELS.length)]
  }

  private selectRandomPremiumModel(): string {
    return PREMIUM_IMAGE_MODELS[Math.floor(Math.random() * PREMIUM_IMAGE_MODELS.length)]
  }

  private selectRandomStandardModel(): string {
    return STANDARD_IMAGE_MODELS[Math.floor(Math.random() * STANDARD_IMAGE_MODELS.length)]
  }
}

// Unified image generation that tries Vertex AI first, then Hugging Face
export async function generateImageUnified(
  options: ImageGenerationOptions
): Promise<GeneratedImage> {
  // Try Vertex AI first (Google Cloud Imagen)
  const vertexProjectId = process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID
  const useVertex = vertexProjectId && process.env.USE_VERTEX_IMAGES !== 'false'

  if (useVertex) {
    try {
      console.log('[Image Gen] Trying Google Cloud Vertex AI Imagen...')
      const vertexService = getVertexImageService()
      const result = await vertexService.generateImageWithFallback({
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        numberOfImages: options.numberOfImages || 1
      })
      console.log('[Image Gen] ✅ Success with Vertex AI Imagen')
      return result
    } catch (error: any) {
      console.warn('[Image Gen] Vertex AI failed, falling back to Hugging Face:', error.message)
      // Fall through to Hugging Face
    }
  }

  // Fallback to Hugging Face
  console.log('[Image Gen] Using Hugging Face models...')
  const hfApiKey = process.env.HUGGINGFACE_API_KEY
  if (!hfApiKey) {
    throw new Error('No image generation service available. Set VERTEX_PROJECT_ID or HUGGINGFACE_API_KEY')
  }

  const hfService = new ImageGenerationService(hfApiKey)
  return await hfService.generateImage(options, undefined, true)
}

export function getImageGenerationService(): ImageGenerationService {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY environment variable is required')
  }
  return new ImageGenerationService(apiKey)
}

