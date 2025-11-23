import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { del } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to view this meeting." },
        { status: 401 }
      )
    }

  const { id } = await params

  const meeting = await retryDbOperation(() =>
    prisma.meeting.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      // Only select needed fields for better performance
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        summary: true,
        actionItems: true,
        keyDecisions: true,
        topics: true,
        transcript: true,
        duration: true,
        createdAt: true,
        processedAt: true,
      },
    })
  )

  if (!meeting) {
    return NextResponse.json(
      { error: "Not found", message: "Meeting not found or you don't have access to it." },
      { status: 404 }
    )
  }

    return NextResponse.json(meeting)
  } catch (error: any) {
    console.error("Error fetching meeting:", error)
    return NextResponse.json(
      { 
        error: "Failed to load meeting",
        message: error?.message || "Unable to load meeting. Please try again."
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to edit meetings." },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const { title, description } = body

    // Verify meeting belongs to user
    const meeting = await retryDbOperation(() =>
      prisma.meeting.findFirst({
        where: {
          id: id,
          userId: session.user.id,
        },
      })
    )

    if (!meeting) {
      return NextResponse.json(
        { error: "Not found", message: "Meeting not found or you don't have access to it." },
        { status: 404 }
      )
    }

  // Update meeting
  const updated = await retryDbOperation(() =>
    prisma.meeting.update({
      where: { id: id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        summary: true,
        actionItems: true,
        keyDecisions: true,
        topics: true,
        transcript: true,
        duration: true,
        createdAt: true,
        processedAt: true,
      },
    })
  )

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("Error updating meeting:", error)
    return NextResponse.json(
      { 
        error: "Update failed",
        message: error?.message || "Unable to update meeting. Please try again."
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to delete meetings." },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify meeting belongs to user before deleting
    const meeting = await retryDbOperation(() =>
      prisma.meeting.findFirst({
        where: {
          id: id,
          userId: session.user.id,
        },
        select: {
          id: true,
          recordingUrl: true,
        },
      })
    )

    if (!meeting) {
      return NextResponse.json(
        { error: "Not found", message: "Meeting not found or you don't have access to it." },
        { status: 404 }
      )
    }

  // Delete file from Vercel Blob Storage if it exists
  if (meeting.recordingUrl) {
    try {
      // Extract the blob URL from the recordingUrl
      // Vercel Blob URLs are in format: https://[account].public.blob.vercel-storage.com/[path]
      await del(meeting.recordingUrl)
    } catch (error: any) {
      // Log error but don't fail the deletion if blob deletion fails
      // The file might have already been deleted or the URL might be invalid
      console.error("Failed to delete file from storage:", error)
      // Continue with database deletion even if storage deletion fails
    }
  }

    // Delete meeting record from database
    await retryDbOperation(() =>
      prisma.meeting.delete({
        where: { id: id },
      })
    )

    return NextResponse.json({ success: true, message: "Meeting deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting meeting:", error)
    return NextResponse.json(
      { 
        error: "Delete failed",
        message: error?.message || "Unable to delete meeting. Please try again."
      },
      { status: 500 }
    )
  }
}

