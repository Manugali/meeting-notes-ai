import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Test database connection endpoint
 * Use this to diagnose connection issues
 */
export async function GET() {
  try {
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({ 
      success: true, 
      message: "Database connection successful",
      result 
    })
  } catch (error: any) {
    console.error("Database connection test failed:", error)
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      details: {
        message: error.message,
        code: error.code,
        meta: error.meta,
        hint: error.code === 'P1001' 
          ? "Cannot reach database server. Check Supabase IP restrictions and project status."
          : "Unknown database error"
      }
    }, { status: 500 })
  }
}

