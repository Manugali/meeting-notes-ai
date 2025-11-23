/**
 * Retry logic for OpenAI API calls
 * Handles transient errors like 502, 503, 429, etc.
 */

export async function retryOpenAICall<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1
      
      // Check if it's a retryable error
      const isRetryable = 
        error.status === 502 || // Bad Gateway
        error.status === 503 || // Service Unavailable
        error.status === 429 || // Rate Limit
        error.status === 500 || // Internal Server Error
        error.message?.includes("502") ||
        error.message?.includes("503") ||
        error.message?.includes("Bad gateway") ||
        error.message?.includes("Service unavailable") ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT"

      if (isRetryable && !isLastAttempt) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000
        console.log(`OpenAI API error (${error.status || error.code}), retrying in ${Math.round(delay)}ms... (${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // If it's not retryable or it's the last attempt, throw
      throw error
    }
  }
  
  throw new Error("Max retries exceeded for OpenAI API call")
}

