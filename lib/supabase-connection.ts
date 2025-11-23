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

