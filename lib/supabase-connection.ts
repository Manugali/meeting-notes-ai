/**
 * Supabase connection optimization
 * For Prisma with adapter, use direct connection (not pooler)
 */

export function optimizeSupabaseConnection(connectionString: string): string {
  try {
    // Check if it's a Supabase URL
    if (!connectionString.includes('supabase.co')) {
      return connectionString
    }

    // URL-encode the password if it contains special characters
    // This is critical for passwords with &, +, @, etc.
    // Extract: postgresql://user:password@host
    const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@(.+)$/
    const match = connectionString.match(urlPattern)
    
    if (match) {
      const [, username, password, rest] = match
      
      // Always encode password to handle special characters safely
      // Even if it looks encoded, re-encode to be safe
      const encodedPassword = encodeURIComponent(decodeURIComponent(password))
      
      // Reconstruct connection string with encoded password
      connectionString = `postgresql://${username}:${encodedPassword}@${rest}`
      
      // Log in production for debugging (without exposing password)
      if (process.env.NODE_ENV === 'production') {
        console.log(`[DB] Password encoding applied (length: ${password.length} -> ${encodedPassword.length})`)
      }
    }

    // Remove pooler parameters - we use our own pool
    let optimized = connectionString
      .replace(/[?&]pgbouncer=[^&]*/gi, '')
      .replace(/[?&]connection_limit=[^&]*/gi, '')
      .replace(/[?&]pool_timeout=[^&]*/gi, '')
    
    // Remove any existing sslmode parameter - we'll handle SSL in Pool config
    optimized = optimized.replace(/[?&]sslmode=[^&]*/gi, '')
    
    // Add optimized parameters
    const params = new URLSearchParams()
    // Longer timeout in production (Vercel serverless needs more time)
    const connectTimeout = process.env.NODE_ENV === 'production' ? '10' : '3'
    params.set('connect_timeout', connectTimeout)
    params.set('application_name', 'meeting-notes-ai')
    // Don't set sslmode here - let the Pool SSL config handle it
    
    // Append params
    const separator = optimized.includes('?') ? '&' : '?'
    optimized = `${optimized}${separator}${params.toString()}`
    
    return optimized
  } catch {
    // If parsing fails, return original
    return connectionString
  }
}

