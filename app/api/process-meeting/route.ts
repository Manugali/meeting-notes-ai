import { auth } from "@/lib/auth"
import { processMeeting } from "@/lib/ai"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { meetingId } = await req.json()

    if (!meetingId) {
      return new NextResponse("Meeting ID required", { status: 400 })
    }

    // Process meeting asynchronously (don't wait for it to complete)
    processMeeting(meetingId).catch((error) => {
      console.error("Background processing error:", error)
    })

    // Return immediately
    return NextResponse.json({ 
      message: "Processing started",
      meetingId 
    })
  } catch (error: any) {
    console.error("Process meeting error:", error)
    return new NextResponse(
      JSON.stringify({ error: error.message || "Failed to start processing" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

