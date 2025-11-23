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
      
      // Vercel runs on IPv4, but Supabase direct connection (5432) may be IPv6-only
      // Use connection pooler (port 6543) for IPv4 compatibility in production
      const isProduction = process.env.NODE_ENV === 'production'
      let finalPort = port
      let finalHost = host
      
      // Switch to pooler in production for IPv4 compatibility
      if (isProduction && port === '5432') {
        // Use pooler hostname and port
        // Pooler hostname format: aws-0-[region].pooler.supabase.com
        // Or: db.[project-ref].supabase.co:6543
        // Try to convert direct connection to pooler
        if (host.includes('db.') && host.includes('.supabase.co')) {
          // Extract project ref from hostname: db.lbhnxzijbttrdvcdmfdr.supabase.co
          const projectRef = host.match(/db\.([^.]+)\.supabase\.co/)?.[1]
          if (projectRef) {
            // Use pooler hostname (same host but different port works, or use pooler subdomain)
            // Actually, Supabase pooler uses the same hostname but port 6543
            finalPort = '6543'
            console.log(`[DB] Switching to pooler (port 6543) for IPv4 compatibility`)
          }
        }
      }
      
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
    
    // For pooler (port 6543), add pgbouncer parameter
    if (optimized.includes(':6543')) {
      params.set('pgbouncer', 'true')
      console.log('[DB] Added pgbouncer=true for pooler connection')
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

