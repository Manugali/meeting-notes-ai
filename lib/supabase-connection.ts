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

    // Parse the connection string
    const url = new URL(connectionString.replace(/^postgresql:\/\//, 'http://'))
    
    // URL-encode the password if it contains special characters
    // This is important for passwords with &, +, @, etc.
    if (url.password && !url.password.includes('%')) {
      // Check if password has special characters that need encoding
      const specialChars = /[&+@#%?=]/g
      if (specialChars.test(url.password)) {
        // Reconstruct URL with encoded password
        const encodedPassword = encodeURIComponent(url.password)
        const newUrl = new URL(connectionString.replace(/^postgresql:\/\//, 'http://'))
        newUrl.password = encodedPassword
        connectionString = connectionString.replace(
          `:${url.password}@`,
          `:${encodedPassword}@`
        )
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

