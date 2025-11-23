/**
 * Centralized error handling utilities
 */

export interface AppError {
  code: string
  message: string
  userMessage: string
  statusCode: number
}

export function createErrorResponse(error: unknown, defaultMessage = "An error occurred"): {
  error: string
  message: string
} {
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("timeout") || error.message.includes("Connection")) {
      return {
        error: "Connection Timeout",
        message: "Database connection timed out. Please try again in a moment.",
      }
    }
    
    if (error.message.includes("P1008") || error.message.includes("connection timeout")) {
      return {
        error: "Database Unavailable",
        message: "Database is temporarily unavailable. Please try again shortly.",
      }
    }
    
    return {
      error: "Error",
      message: error.message || defaultMessage,
    }
  }
  
  return {
    error: "Unknown Error",
    message: defaultMessage,
  }
}

/**
 * Check if error is a connection/timeout error
 */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("Connection terminated") ||
      error.message.includes("connection timeout") ||
      error.message.includes("timeout exceeded") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ECONNREFUSED") ||
      (error as any).code === "P1008" ||
      (error as any).code === "ETIMEDOUT"
    )
  }
  return false
}

