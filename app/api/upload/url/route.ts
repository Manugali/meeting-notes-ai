import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Generate upload information for direct client-side upload
 * For files > 4.5MB, we'll use a workaround since Vercel has body size limits
 */
export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { filename, contentType, size } = body

    if (!filename) {
      return NextResponse.json(
        { error: "Filename required" },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB for OpenAI Whisper API)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (size && size > maxSize) {
      return NextResponse.json(
        { 
          error: "File too large",
          message: `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds the 25MB limit for AI processing. Please compress your file.`
        },
        { status: 400 }
      )
    }

    // For now, return the path - we'll handle upload differently
    // The client will need to use a different method for large files
    const blobPath = `meetings/${session.user.id}/${Date.now()}-${filename}`

    return NextResponse.json({ 
      path: blobPath,
      filename,
      // Note: Direct upload URL generation requires Vercel Blob client-side SDK
      // For now, we recommend compressing files to under 4.5MB
    })
  } catch (error: any) {
    console.error("Error generating upload info:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate upload info",
        message: error?.message || "Failed to generate upload info. Please try again."
      },
      { status: 500 }
    )
  }
}

