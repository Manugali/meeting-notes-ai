/**
 * Supabase connection optimization
 * For serverless (Vercel), try connection pooler first (port 6543)
 * Falls back to direct connection (port 5432) if pooler doesn't work
 */

export function optimizeSupabaseConnection(connectionString: string): string {
  try {
    // Check if it's a Supabase URL
    if (!connectionString.includes('supabase.co')) {
      return connectionString
    }

    // URL-encode the password if it contains special characters
    // This is critical for passwords with &, +, @, etc.
    // Extract: postgresql://user:password@host:port/db
    const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/
    const match = connectionString.match(urlPattern)
    
    if (match) {
      const [, username, password, host, port, database] = match
      
      // Always encode password to handle special characters safely
      const encodedPassword = encodeURIComponent(decodeURIComponent(password))
      
      // Prisma adapter requires direct connection (port 5432), not pooler
      // Keep the original port - don't switch to pooler
      const finalPort = port
      
      // Reconstruct connection string with encoded password
      connectionString = `postgresql://${username}:${encodedPassword}@${host}:${finalPort}/${database}`
      
      // Log in production for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log(`[DB] Using direct connection on port ${finalPort}`)
        console.log(`[DB] Host: ${host}`)
        console.log(`[DB] Password encoding applied`)
      }
    }

    // Remove existing pooler parameters - we'll add our own
    let optimized = connectionString
      .replace(/[?&]pgbouncer=[^&]*/gi, '')
      .replace(/[?&]connection_limit=[^&]*/gi, '')
      .replace(/[?&]pool_timeout=[^&]*/gi, '')
    
    // Remove any existing sslmode parameter - we'll handle SSL in Pool config
    optimized = optimized.replace(/[?&]sslmode=[^&]*/gi, '')
    
    // Add optimized parameters
    const params = new URLSearchParams()
    // Longer timeout in production (Vercel serverless needs more time)
    const connectTimeout = process.env.NODE_ENV === 'production' ? '15' : '3'
    params.set('connect_timeout', connectTimeout)
    params.set('application_name', 'meeting-notes-ai')
    // Don't add pgbouncer - we're using direct connection for Prisma adapter
    
    // Append params
    const separator = optimized.includes('?') ? '&' : '?'
    optimized = `${optimized}${separator}${params.toString()}`
    
    return optimized
  } catch (error) {
    // If parsing fails, return original
    console.error('[DB] Connection string optimization failed:', error)
    return connectionString
  }
}

