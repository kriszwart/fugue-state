/**
 * Utility for generating context-aware, actionable error messages
 */

export interface ErrorContext {
  operation: string
  step?: string
  succeededSteps?: string[]
  failedSteps?: string[]
  errorType?: 'timeout' | 'network' | 'auth' | 'rate_limit' | 'validation' | 'unknown'
  retryable?: boolean
}

/**
 * Generate a user-friendly error message with context
 */
export function getErrorMessage(error: any, context: ErrorContext): string {
  const { operation, step, succeededSteps = [], failedSteps = [], errorType, retryable } = context
  
  // Determine error type if not provided
  const detectedType = errorType || detectErrorType(error)
  const isRetryable = retryable !== undefined ? retryable : isRetryableError(error)

  // Build base message
  let message = ''

  if (step) {
    message = `${step} failed`
  } else {
    message = `${operation} failed`
  }

  // Add specific error details
  if (detectedType === 'timeout') {
    message += ': The operation timed out. This usually means the service is slow or unavailable.'
  } else if (detectedType === 'network') {
    message += ': Network connection issue. Please check your internet connection.'
  } else if (detectedType === 'auth') {
    message += ': Authentication failed. Please refresh the page and try again.'
  } else if (detectedType === 'rate_limit') {
    message += ': Rate limit exceeded. Please wait a moment before trying again.'
  } else if (detectedType === 'validation') {
    message += ': Invalid input. Please check your data and try again.'
  } else if (error?.message) {
    message += `: ${error.message}`
  }

  // Add partial success information
  if (succeededSteps.length > 0 && failedSteps.length > 0) {
    message += `\n\nPartial success: ${succeededSteps.join(', ')} completed successfully.`
    message += `\nFailed: ${failedSteps.join(', ')}.`
    message += `\n\nYou can retry the failed steps individually.`
  } else if (succeededSteps.length > 0) {
    message += `\n\nNote: Some steps completed successfully before the failure.`
  }

  // Add actionable suggestion
  if (isRetryable) {
    message += `\n\nThis error is usually temporary. Try again in a moment.`
  } else if (detectedType === 'auth') {
    message += `\n\nPlease sign out and sign back in if the problem persists.`
  } else if (detectedType === 'validation') {
    message += `\n\nPlease check your input and try again with different data.`
  }

  return message
}

/**
 * Detect error type from error object
 */
function detectErrorType(error: any): ErrorContext['errorType'] {
  const message = (error?.message || '').toLowerCase()
  const code = (error?.code || '').toLowerCase()

  if (message.includes('timeout') || code.includes('timeout') || error?.name === 'TimeoutError') {
    return 'timeout'
  }
  if (message.includes('network') || message.includes('fetch') || code.includes('econnreset')) {
    return 'network'
  }
  if (message.includes('unauthorized') || message.includes('auth') || message.includes('401') || message.includes('403')) {
    return 'auth'
  }
  if (message.includes('rate limit') || message.includes('429') || message.includes('quota')) {
    return 'rate_limit'
  }
  if (message.includes('invalid') || message.includes('validation') || message.includes('400')) {
    return 'validation'
  }

  return 'unknown'
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const errorType = detectErrorType(error)
  return errorType ? ['timeout', 'network', 'rate_limit'].includes(errorType) : false
}

/**
 * Generate error message for pipeline failures
 */
export function getPipelineErrorMessage(
  pipelineResult: { steps: Array<{ step: string; status: string; error?: string }>; overallStatus: string }
): string {
  const failedSteps = pipelineResult.steps.filter(s => s.status === 'failed')
  const succeededSteps = pipelineResult.steps.filter(s => s.status === 'success')

  if (pipelineResult.overallStatus === 'partial') {
    return getErrorMessage(
      new Error('Some pipeline steps failed'),
      {
        operation: 'Pipeline',
        succeededSteps: succeededSteps.map(s => s.step),
        failedSteps: failedSteps.map(s => s.step),
        retryable: true,
      }
    )
  }

  if (pipelineResult.overallStatus === 'failed') {
    const firstError = failedSteps[0]?.error || 'Unknown error'
    return getErrorMessage(
      new Error(firstError),
      {
        operation: 'Pipeline',
        failedSteps: failedSteps.map(s => s.step),
        retryable: true,
      }
    )
  }

  return 'Pipeline completed successfully'
}












