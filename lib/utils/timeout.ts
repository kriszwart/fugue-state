/**
 * Timeout utility for wrapping promises with timeout behavior
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message for timeout
 * @returns The promise result or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new TimeoutError(errorMessage)), timeoutMs)
  )
  
  return Promise.race([promise, timeout])
}

/**
 * Timeout constants for different operation types
 */
export const TIMEOUTS = {
  LLM: 30000,        // 30 seconds for LLM calls
  IMAGE_GENERATION: 60000,  // 60 seconds for image generation
  TTS: 30000,        // 30 seconds for text-to-speech (increased from 10s for eleven_v3 model)
  SCAN: 20000,       // 20 seconds for memory scanning
  PIPELINE_STEP: 45000, // 45 seconds for individual pipeline steps
  DEFAULT: 30000,     // 30 seconds default
} as const










