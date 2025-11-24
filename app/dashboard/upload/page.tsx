"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toaster"
import Link from "next/link"

// Helper function for direct client-side upload to Vercel Blob
async function uploadFileToVercelBlob(file: File, uploadUrl: string, onProgress: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        onProgress(percentComplete)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // The URL is the uploadUrl itself for direct uploads
        resolve(uploadUrl.split('?')[0]) // Remove query params from the final URL
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error during upload.'))
    }

    xhr.send(file)
  })
}

export default function UploadPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  if (!session) {
    router.push("/login")
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      if (!title) {
        setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  // Helper function for direct client-side upload to Vercel Blob
  async function uploadFileToVercelBlob(file: File, uploadUrl: string, onProgress: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // The URL is the uploadUrl itself for direct uploads
          resolve(uploadUrl.split('?')[0]) // Remove query params from the final URL
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Network error during upload.'))
      }

      xhr.send(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Check file size limits
      const vercelLimit = 4.5 * 1024 * 1024 // 4.5MB (Vercel serverless function body limit)
      const openAILimit = 25 * 1024 * 1024 // 25MB (OpenAI Whisper limit)
      
      if (file.size > openAILimit) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the 25MB limit for AI processing. Please compress your file.`)
      }

      let blobUrl: string

      // Use direct upload for files > 4.5MB to bypass Vercel's serverless function limit
      if (file.size > vercelLimit) {
        setUploadProgress(5) // Show initial progress
        
        // Step 1: Get signed upload URL
        const getUrlRes = await fetch("/api/upload/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        })

        if (!getUrlRes.ok) {
          const errorData = await getUrlRes.json().catch(() => ({ error: "Failed to get upload URL", message: "Failed to get upload URL." }))
          throw new Error(errorData.message || errorData.error || "Failed to get upload URL")
        }

        const { uploadUrl } = await getUrlRes.json()
        setUploadProgress(10) // URL obtained

        // Step 2: Upload file directly to Vercel Blob using the signed URL
        blobUrl = await uploadFileToVercelBlob(file, uploadUrl, (progress) => {
          // Scale progress: 10% (URL) + 80% (upload) = 90% total
          setUploadProgress(10 + (progress * 0.8))
        })
        
        setUploadProgress(90) // Ensure it's at 90% after upload completes
      } else {
        // For small files, use the regular upload endpoint
        const formData = new FormData()
        formData.append("file", file)

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({ error: "Upload failed", message: "Upload failed" }))
          throw new Error(errorData.message || errorData.error || "Upload failed")
        }

        const result = await uploadRes.json()
        blobUrl = result.url
        setUploadProgress(50)
      }

      // Step 2: Create meeting record
      const meetingRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled Meeting",
          description,
          recordingUrl: blobUrl,
          metadata: {
            filename: file.name,
            size: file.size,
            type: file.type,
          },
        }),
      })

      if (!meetingRes.ok) {
        const errorData = await meetingRes.json().catch(() => ({ error: "Failed to create meeting", message: "Failed to create meeting" }))
        if (meetingRes.status === 403) {
          // Usage limit exceeded
          throw new Error(errorData.message || errorData.error || "You've reached your monthly meeting limit. Please upgrade your plan.")
        }
        throw new Error(errorData.message || errorData.error || "Failed to create meeting")
      }

      const meeting = await meetingRes.json()
      
      // If we used direct upload, we're already at 90%, otherwise set it now
      if (file.size <= vercelLimit) {
        setUploadProgress(90)
      }

      // Step 3: Start AI processing (async, don't wait)
      try {
        await fetch("/api/process-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId: meeting.id }),
        })
      } catch (error) {
        console.error("Failed to start processing:", error)
        // Don't fail the upload if processing start fails
      }

      setUploadProgress(100)

      toast.success("Meeting uploaded successfully!", "Your meeting is being processed. This may take a few minutes.")

      // Redirect to meeting detail page
      setTimeout(() => {
        router.push(`/dashboard/meetings/${meeting.id}`)
      }, 1000)
    } catch (error: any) {
      console.error("Upload error:", error)
      const errorMessage = error.message || "Failed to upload meeting. Please try again."
      
      // If it's a usage limit error
      if (errorMessage.includes("limit") || errorMessage.includes("upgrade")) {
        toast.error(
          "Usage Limit Reached",
          "You've reached your monthly meeting limit. Upgrade your plan to upload more meetings."
        )
        setTimeout(() => {
          router.push("/pricing")
        }, 2000)
      } else if (errorMessage.includes("25MB") || errorMessage.includes("size")) {
        toast.error(
          "File Too Large",
          "The file exceeds the 25MB limit. Please compress your file or split it into smaller segments."
        )
      } else if (errorMessage.includes("type") || errorMessage.includes("format")) {
        toast.error(
          "Invalid File Type",
          "Please upload audio or video files only (MP3, WAV, MP4, etc.)"
        )
      } else {
        toast.error(
          "Upload Failed",
          errorMessage
        )
      }
      
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Meeting Notes AI
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-6">Upload Meeting Recording</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="file">Meeting Recording</Label>
              <Input
                id="file"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                required
                disabled={isUploading}
                className="mt-2"
              />
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Standup - Nov 20"
                required
                disabled={isUploading}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any notes about this meeting..."
                className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                disabled={isUploading}
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">Uploading and processing...</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!file || isUploading}>
              {isUploading ? "Uploading..." : "Upload & Process"}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Supported Formats</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Audio: MP3, WAV, M4A, OGG</li>
              <li>• Video: MP4, MOV, AVI, WebM</li>
              <li>• Maximum file size: 25 MB (for AI processing)</li>
              <li className="text-orange-600 font-medium">• Tip: Compress large files before uploading</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

