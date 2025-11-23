import { prisma } from "./db"

/**
 * Health check for database connection
 * Returns true if database is reachable, false otherwise
 * Only call this when explicitly needed, not on module load
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/**
 * Initialize database connection with health check
 * This helps establish connection early
 * Only call this explicitly when needed, not automatically
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection with timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 2000)
      )
    ])
  } catch (error) {
    // Silently fail - connection will be retried on first use
    // Don't log this as it's expected during cold starts
  }
}

// Don't initialize on module load - let connections happen on-demand
// This prevents unnecessary connection attempts and log spam

