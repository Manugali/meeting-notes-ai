import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Test database connection endpoint
 * Use this to diagnose connection issues
 */
export async function GET() {
  try {
    // Log connection string info (without password) for debugging
    const dbUrl = process.env.DATABASE_URL || ''
    const urlInfo = dbUrl.replace(/:[^:@]+@/, ':****@') // Mask password
    console.log(`[DB TEST] Connection string: ${urlInfo.substring(0, 100)}...`)
    
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({ 
      success: true, 
      message: "Database connection successful",
      result 
    })
  } catch (error: any) {
    console.error("Database connection test failed:", error)
    
    // Provide more helpful error message
    let hint = "Unknown database error"
    if (error.code === 'P1001' || error.code === 'P2010') {
      hint = "Cannot reach database server. The password in DATABASE_URL may need URL encoding. Password '5y5CfV&ww+5M46y' should be encoded as '5y5CfV%26ww%2B5M46y' in Vercel environment variables."
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      details: {
        message: error.message,
        code: error.code,
        meta: error.meta,
        hint
      }
    }, { status: 500 })
  }
}

