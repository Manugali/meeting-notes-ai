import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { optimizeSupabaseConnection } from './supabase-connection'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  try {
    // Log connection attempt in production for debugging (without exposing password)
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      // Extract hostname and port using regex to avoid URL constructor issues
      const hostMatch = process.env.DATABASE_URL.match(/@([^:]+):(\d+)\//)
      if (hostMatch) {
        console.log(`[DB] Attempting connection to: ${hostMatch[1]}:${hostMatch[2]}`)
      } else {
        console.log(`[DB] Attempting connection to Supabase database`)
      }
    }
    
    // Optimize connection string for Supabase
    const connectionString = optimizeSupabaseConnection(process.env.DATABASE_URL)
    
    // Configure SSL for Supabase - always use SSL but don't verify certificate chain
    // This is safe for Supabase as they use valid certificates, but Node.js may have chain issues
    const isSupabase = connectionString.includes('supabase.co')
    const sslConfig = isSupabase ? {
      rejectUnauthorized: false, // Allow self-signed certs in chain (Supabase certs are valid)
    } : undefined

    // Production needs longer timeouts due to cold starts and network latency
    // Note: isProduction already defined above
    const connectionTimeout = isProduction ? 10000 : 2000 // 10s in prod, 2s in dev
    const queryTimeout = isProduction ? 30000 : 8000 // 30s in prod, 8s in dev
    
    const pool = new Pool({ 
      connectionString,
      max: isProduction ? 10 : 5, // Larger pool in production
      min: 0, // Don't keep connections idle (Supabase handles this)
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: connectionTimeout,
      // Keep connections alive in production
      keepAlive: isProduction, // Keep alive in production for better performance
      // Query timeouts - longer in production
      statement_timeout: queryTimeout,
      query_timeout: queryTimeout,
      // Connection pool optimization
      allowExitOnIdle: !isProduction, // Keep connections in production
      // SSL configuration - must be set for Supabase
      ssl: sslConfig,
    })
    
    // Handle pool errors gracefully
    pool.on('error', (err) => {
      // Only log in development, don't spam production
      if (process.env.NODE_ENV === 'development') {
        console.error('Database pool error:', err.message)
      }
    })
    
    // Handle connection events
    pool.on('connect', () => {
      // Connection established - good for debugging
    })
    
    pool.on('remove', () => {
      // Connection removed from pool
    })
    
    const adapter = new PrismaPg(pool)

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (error: any) {
    console.error('Failed to create Prisma client:', error)
    
    // Provide helpful error message for production
    if (process.env.NODE_ENV === 'production') {
      if (error.message?.includes('DATABASE_URL') || !process.env.DATABASE_URL) {
        console.error('[DB ERROR] DATABASE_URL environment variable is not set in Vercel')
      } else if (error.message?.includes("Can't reach database server") || error.code === 'P1001') {
        console.error('[DB ERROR] Cannot reach Supabase database. Check:')
        console.error('  1. Supabase IP restrictions (Settings → Database → Connection Pooling)')
        console.error('  2. DATABASE_URL is correct in Vercel environment variables')
        console.error('  3. Supabase project is not paused')
      }
    }
    
    throw error
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Don't import db-health here - it causes unnecessary connection attempts
// Connections will be established on-demand when queries are made

