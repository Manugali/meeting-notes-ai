import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { generateBlobUploadUrl } from "@vercel/blob"

/**
 * Generate signed upload URL for direct client-to-Vercel Blob upload
 * This bypasses Vercel's 4.5MB serverless function body limit
 * Use this for files > 4.5MB
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

    // Generate signed upload URL for direct client-side upload
    const uploadUrl = await generateBlobUploadUrl(
      `meetings/${session.user.id}/${Date.now()}-${filename}`,
      {
        access: "public",
        contentType: contentType || "application/octet-stream",
        addRandomSuffix: false,
      },
      {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      }
    )

    return NextResponse.json({ 
      uploadUrl,
      filename,
    })
  } catch (error: any) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate upload URL",
        message: error?.message || "Failed to generate upload URL. Please try again."
      },
      { status: 500 }
    )
  }
}

