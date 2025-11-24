import { auth } from "@/lib/auth"
import { syncTeamsMeetings } from "@/lib/teams"
import { NextResponse } from "next/server"

/**
 * API route to manually sync Teams meetings
 * DISABLED: Teams integration is currently disabled
 */
export async function POST() {
  return NextResponse.json(
    { error: "Teams integration is currently disabled" },
    { status: 503 }
  )
  
  /* DISABLED - Teams integration
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user ID from session
    const userId = (session.user as any).id || (session.user as any).sub
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      )
    }

    // Sync meetings
    const result = await syncTeamsMeetings(userId)

    return NextResponse.json({
      success: true,
      ...result,
      message: `Found ${result.total} meetings, processed ${result.processed} new recordings.`,
    })
  } catch (error: any) {
    console.error("Error syncing Teams meetings:", error)
    
    // Provide user-friendly error messages
    let errorMessage = error.message || "An error occurred while syncing Teams meetings."
    let statusCode = 500
    
    // Check if it's a permission/authentication error
    if (error.message?.includes("personal Microsoft accounts") || 
        error.message?.includes("not available") ||
        error.message?.includes("authenticating with resource")) {
      statusCode = 403 // Forbidden - permission issue
    }
    
    return NextResponse.json(
      {
        error: "Failed to sync meetings",
        message: errorMessage,
      },
      { status: statusCode }
    )
  }
  */
}

