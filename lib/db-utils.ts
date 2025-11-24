import { prisma } from "./db"

/**
 * Retry database operations with exponential backoff
 * Useful for handling connection timeouts and transient errors
 */
export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 0, // No retries by default - fail fast
  delay = 100, // Very short delay if retry needed
  fastMode = false // Fast mode for auth operations
): Promise<T> {
  for (let i = 0; i < maxRetries + 1; i++) {
    try {
      return await operation()
    } catch (error: any) {
      const isLastAttempt = i === maxRetries
      
      // Check if it's a connection error
      const isConnectionError =
        error.message?.includes("Connection terminated") ||
        error.message?.includes("connection timeout") ||
        error.message?.includes("Connection terminated unexpectedly") ||
        error.message?.includes("timeout") ||
        error.message?.includes("timeout exceeded") ||
        error.message?.includes("Can't reach database server") ||
        error.code === "P1001" || // Prisma can't reach database server
        error.code === "P1008" || // Prisma connection timeout
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNREFUSED"

      if (isConnectionError && !isLastAttempt) {
        // Calculate retry delay
        let retryDelay: number
        if (fastMode) {
          // Fast mode: linear backoff (50ms, 100ms, 150ms...)
          retryDelay = 50 * (i + 1)
        } else {
          // Normal mode: exponential backoff (delay, delay*2, delay*4...)
          retryDelay = delay * Math.pow(2, i)
        }
        
        console.warn(`Database connection error, retrying in ${retryDelay}ms... (${i + 1}/${maxRetries + 1})`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        continue
      }

      // If it's not a connection error or it's the last attempt, throw
      throw error
    }
  }
  
  throw new Error("Max retries exceeded for database operation")
}

