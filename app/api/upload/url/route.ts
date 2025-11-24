import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Generate upload URL using Vercel Blob REST API
 * For files > 4.5MB, we'll use direct upload to Vercel Blob
 * This bypasses Vercel's serverless function body limit
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
    
    // Use Vercel Blob REST API to create an upload URL
    const response = await fetch(`https://blob.vercel-storage.com/${blobPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'x-content-type': contentType || 'application/octet-stream',
        'x-add-random-suffix': 'false',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to create upload URL: ${response.statusText}`)
    }

    const data = await response.json()
    
    // The response should contain the upload URL
    return NextResponse.json({ 
      uploadUrl: data.url || `https://blob.vercel-storage.com/${blobPath}`,
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

