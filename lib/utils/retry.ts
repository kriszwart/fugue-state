/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT', 'rate limit'],
}

/**
 * Checks if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code?.toLowerCase() || ''
  
  return retryableErrors.some(retryable => 
    errorMessage.includes(retryable.toLowerCase()) || 
    errorCode.includes(retryable.toLowerCase())
  )
}

/**
 * Retries a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Don't retry if it's the last attempt
      if (attempt === opts.maxAttempts) {
        throw error
      }
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      )
      
      console.log(`[Retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms...`, error.message)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

/**
 * Retry wrapper specifically for API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return withRetry(apiCall, {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: ['timeout', 'network', 'ECONNRESET', 'ETIMEDOUT', 'rate limit', '503', '502', '504'],
    ...options,
  })
}












