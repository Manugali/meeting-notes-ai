import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

// Configure route to handle larger requests (though Vercel still has 4.5MB body limit)
export const maxDuration = 60 // 60 seconds timeout

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", message: "Please sign in to upload files." }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided", message: "Please select a file to upload." },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB for OpenAI Whisper API)
    const maxSize = 25 * 1024 * 1024 // 25MB (OpenAI Whisper limit)
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
      return NextResponse.json(
        { 
          error: "File too large",
          message: `Your file is ${fileSizeMB}MB. Maximum size is 25MB for AI processing. Please compress your file or split it into smaller segments.`
        },
        { status: 400 }
      )
    }

    // Validate file type (audio/video)
    const allowedTypes = [
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg",
      "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|ogg|mp4|mov|avi|webm)$/i)) {
      return NextResponse.json(
        { 
          error: "Invalid file type",
          message: "Please upload audio or video files only (MP3, WAV, MP4, MOV, etc.)"
        },
        { status: 400 }
      )
    }

    try {
      // Upload to Vercel Blob Storage
      const blob = await put(`meetings/${session.user.id}/${Date.now()}-${file.name}`, file, {
        access: "public",
        contentType: file.type,
      })

      return NextResponse.json({ 
        url: blob.url, 
        filename: file.name, 
        size: file.size,
        contentType: file.type
      })
    } catch (error: any) {
      console.error("Upload error:", error)
      
      // Check if it's a body size limit error
      if (error.message?.includes("413") || error.message?.includes("Payload Too Large") || error.message?.includes("request entity too large")) {
        return NextResponse.json(
          { 
            error: "File too large",
            message: "File exceeds Vercel's 4.5MB upload limit. Please compress your file to under 4.5MB. You can use tools like HandBrake (for video) or online compressors."
          },
          { status: 413 }
        )
      }
      
      return NextResponse.json(
        { 
          error: "Upload failed",
          message: error?.message || "Failed to upload file. Please check your connection and try again."
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Request processing error:", error)
    return NextResponse.json(
      { 
        error: "Request failed",
        message: error?.message || "Failed to process request. Please try again."
      },
      { status: 500 }
    )
  }
}

