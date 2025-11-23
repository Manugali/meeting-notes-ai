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
      
      // Check if this is already a pooler connection
      // Pooler connections have: pooler.supabase.com hostname OR username with project ref (postgres.PROJECT_REF)
      const isPoolerConnection = host.includes('pooler.supabase.com') || username.includes('.')
      
      // If it's a direct connection in production, we should use pooler for IPv4 compatibility
      // But if user already provided pooler connection string, use it as-is
      const isProduction = process.env.NODE_ENV === 'production'
      
      if (isProduction && !isPoolerConnection && port === '5432') {
        console.log(`[DB] Warning: Direct connection may not be IPv4 compatible. Consider using Session Pooler connection string.`)
      }
      
      // Use the connection as provided - don't modify host/port if it's already a pooler connection
      const finalPort = port
      const finalHost = host
      
      // Reconstruct connection string with encoded password
      connectionString = `postgresql://${username}:${encodedPassword}@${finalHost}:${finalPort}/${database}`
      
      // Log in production for debugging
      if (isProduction) {
        console.log(`[DB] Using ${finalPort === '6543' ? 'pooler' : 'direct'} connection on port ${finalPort}`)
        console.log(`[DB] Host: ${finalHost}`)
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
    
    // For pooler connections, add pgbouncer parameter
    // Pooler connections have pooler.supabase.com hostname OR username with project ref
    const isPoolerConnection = optimized.includes('pooler.supabase.com') || 
                               optimized.match(/postgresql:\/\/postgres\.[^:]+:/)
    
    if (isPoolerConnection) {
      params.set('pgbouncer', 'true')
      if (process.env.NODE_ENV === 'production') {
        console.log('[DB] Detected pooler connection - added pgbouncer=true')
      }
    }
    
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

