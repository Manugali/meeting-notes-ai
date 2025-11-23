import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { canUserUpload } from "@/lib/usage-limits"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to view your meetings." },
        { status: 401 }
      )
    }

  const meetings = await retryDbOperation(() =>
    prisma.meeting.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        summary: true,
      },
    })
  )

    return NextResponse.json(meetings)
  } catch (error: any) {
    console.error("Error fetching meetings:", error)
    return NextResponse.json(
      { 
        error: "Failed to load meetings",
        message: error?.message || "Unable to load your meetings. Please try again."
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      console.error("No session or user found")
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to create a meeting." },
        { status: 401 }
      )
    }

    // Get user ID from session (should be set by callback)
    const userId = (session.user as any).id
    
    if (!userId) {
      console.error("No user ID in session:", session)
      return NextResponse.json(
        { error: "Authentication error", message: "Unable to identify user. Please sign in again." },
        { status: 401 }
      )
    }

    // Check usage limits
    const usageCheck = await canUserUpload(userId)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { 
          error: "Usage limit exceeded",
          message: usageCheck.reason || "You've reached your monthly meeting limit.",
          limits: usageCheck.limits 
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { title, description, recordingUrl, metadata } = body

    console.log("Creating meeting for user:", userId, "with data:", { title, recordingUrl })

    const meeting = await retryDbOperation(() =>
      prisma.meeting.create({
        data: {
          userId: userId,
          title: title || "Untitled Meeting",
          description,
          recordingUrl,
          metadata: metadata || {},
          status: "pending",
        },
      })
    )

    return NextResponse.json(meeting)
  } catch (error: any) {
    console.error("Error creating meeting:", error)
    
    // Check for specific error types
    if (error?.message?.includes("timeout") || error?.message?.includes("Connection")) {
      return NextResponse.json(
        { 
          error: "Connection timeout",
          message: "Database connection timed out. Please try again in a moment."
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create meeting",
        message: error?.message || "Unable to create meeting. Please try again."
      },
      { status: 500 }
    )
  }
}

