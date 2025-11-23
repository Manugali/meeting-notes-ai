import { auth } from "@/lib/auth"
import { syncTeamsMeetings } from "@/lib/teams"
import { NextResponse } from "next/server"

/**
 * API route to manually sync Teams meetings
 * Fetches recent call records and processes recordings
 */
export async function POST() {
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
    return NextResponse.json(
      {
        error: "Failed to sync meetings",
        message: error.message || "An error occurred while syncing Teams meetings.",
      },
      { status: 500 }
    )
  }
}

