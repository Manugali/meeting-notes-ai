import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Generate upload token for client-side direct upload
 * For files > 4.5MB, we'll use direct upload to Vercel Blob
 * This bypasses Vercel's serverless function body limit
 * 
 * Returns a token that the client can use with @vercel/blob/client
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

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 500 }
      )
    }

    const blobPath = `meetings/${session.user.id}/${Date.now()}-${filename}`
    
    // Return the path and token - client will use @vercel/blob/client to upload
    // The client SDK will handle the upload URL generation
    return NextResponse.json({ 
      path: blobPath,
      token: process.env.BLOB_READ_WRITE_TOKEN, // Pass token to client for upload
      filename,
      contentType: contentType || 'application/octet-stream',
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

