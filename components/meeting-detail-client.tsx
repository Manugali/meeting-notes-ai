"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toaster"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { format } from "date-fns"

interface Meeting {
  id: string
  title: string
  description: string | null
  status: string
  summary: string | null
  actionItems: any
  keyDecisions: any
  topics: any
  transcript: string | null
  duration: number | null
  createdAt: Date
  processedAt: Date | null
}

interface MeetingDetailClientProps {
  initialMeeting: Meeting
}

export function MeetingDetailClient({ initialMeeting }: MeetingDetailClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [meeting, setMeeting] = useState(initialMeeting)
  const [isPolling, setIsPolling] = useState(initialMeeting.status === "processing" || initialMeeting.status === "pending")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(meeting.title)
  const [editDescription, setEditDescription] = useState(meeting.description || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isPolling) return

    let pollCount = 0
    let currentInterval = 3000 // Start with 3 seconds
    let timeoutId: NodeJS.Timeout | null = null
    let isActive = true

    const poll = async () => {
      if (!isActive) return

      try {
        const response = await fetch(`/api/meetings/${meeting.id}`)
        if (response.ok) {
          const updatedMeeting = await response.json()
          setMeeting(updatedMeeting)
          
          // Stop polling if meeting is completed or failed
          if (updatedMeeting.status === "completed" || updatedMeeting.status === "failed") {
            setIsPolling(false)
            if (updatedMeeting.status === "completed") {
              toast.success("Processing complete!", "Your meeting has been processed successfully.")
            }
            return
          }

          // Increase polling interval after first few polls (exponential backoff)
          // This reduces server load for long-running processes
          pollCount++
          if (pollCount > 5) {
            currentInterval = Math.min(currentInterval * 1.2, 10000) // Max 10 seconds
          }
        }
      } catch (error) {
        console.error("Error polling meeting status:", error)
        // On error, increase interval to avoid hammering the server
        currentInterval = Math.min(currentInterval * 1.5, 15000) // Max 15 seconds on errors
      }

      // Schedule next poll with dynamic interval
      if (isActive && isPolling) {
        timeoutId = setTimeout(poll, currentInterval)
      }
    }

    // Start polling
    timeoutId = setTimeout(poll, currentInterval)

    return () => {
      isActive = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [meeting.id, isPolling, toast])

  const handleEdit = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update meeting" }))
        throw new Error(errorData.message || errorData.error || "Failed to update meeting")
      }

      const updated = await response.json()
      setMeeting(updated)
      setIsEditOpen(false)
      toast.success("Meeting updated", "Your changes have been saved successfully.")
    } catch (error: any) {
      console.error("Error updating meeting:", error)
      toast.error(
        "Update Failed",
        error?.message || "Failed to update meeting. Please try again."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete meeting" }))
        throw new Error(errorData.message || errorData.error || "Failed to delete meeting")
      }

      toast.success("Meeting deleted", "The meeting has been permanently deleted.")
      setTimeout(() => {
        router.push("/dashboard")
      }, 500)
    } catch (error: any) {
      console.error("Error deleting meeting:", error)
      toast.error(
        "Delete Failed",
        error?.message || "Failed to delete meeting. Please try again."
      )
      setIsDeleting(false)
    }
  }

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/meetings/${meeting.id}/export?format=${format}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to export meeting" }))
        throw new Error(errorData.message || errorData.error || "Failed to export meeting")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${meeting.title.replace(/[^a-z0-9]/gi, "_")}.${format === "docx" ? "txt" : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Export started", `Your meeting is being downloaded as ${format.toUpperCase()}.`)
    } catch (error: any) {
      console.error("Error exporting meeting:", error)
      toast.error(
        "Export Failed",
        error?.message || "Failed to export meeting. Please try again."
      )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Meeting Notes AI
          </Link>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport("txt")}>
                  Export as TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("docx")}>
                  Export as DOCX (TXT)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Edit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Meeting</DialogTitle>
                  <DialogDescription>
                    Update the title and description of this meeting.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEdit} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Meeting</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{meeting.title}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Link href="/dashboard">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{meeting.title}</h1>
            <Badge className={getStatusColor(meeting.status)}>
              {meeting.status}
            </Badge>
            {isPolling && (
              <span className="text-sm text-gray-500 animate-pulse">Processing...</span>
            )}
          </div>
          <p className="text-gray-600">
            Created {format(new Date(meeting.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        {/* Summary */}
        {meeting.summary ? (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{meeting.summary}</p>
          </Card>
        ) : meeting.status === "processing" || meeting.status === "pending" ? (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Processing your meeting... This may take a few minutes.</p>
            </div>
          </Card>
        ) : (
          <Card className="p-6 mb-6">
            <p className="text-gray-600">Summary will appear here once processing is complete.</p>
          </Card>
        )}

        {/* Action Items */}
        {meeting.actionItems && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Action Items</h2>
            <ul className="space-y-2">
              {Array.isArray(meeting.actionItems) &&
                meeting.actionItems.map((item: any, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span className="text-gray-700">{item.text || item}</span>
                    {item.assignee && (
                      <Badge className="ml-2">{item.assignee}</Badge>
                    )}
                  </li>
                ))}
            </ul>
          </Card>
        )}

        {/* Key Decisions */}
        {meeting.keyDecisions && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Key Decisions</h2>
            <ul className="space-y-2">
              {Array.isArray(meeting.keyDecisions) &&
                meeting.keyDecisions.map((decision: any, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-700">{decision.text || decision}</span>
                  </li>
                ))}
            </ul>
          </Card>
        )}

        {/* Topics */}
        {meeting.topics && Array.isArray(meeting.topics) && meeting.topics.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Topics Discussed</h2>
            <ul className="space-y-2">
              {meeting.topics.map((topic: any, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="text-purple-600 mr-2">•</span>
                  <div>
                    <span className="text-gray-700 font-medium">{topic.name || topic}</span>
                    {topic.description && (
                      <p className="text-sm text-gray-500 ml-4">{topic.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Transcript */}
        {meeting.transcript && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Full Transcript</h2>
            <div className="max-h-96 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap text-sm">{meeting.transcript}</p>
            </div>
          </Card>
        )}

        {/* Metadata */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Meeting Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-600">Duration</dt>
              <dd className="font-medium">
                {meeting.duration ? `${Math.floor(meeting.duration / 60)} minutes` : "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Status</dt>
              <dd className="font-medium">{meeting.status}</dd>
            </div>
            {meeting.processedAt && (
              <div>
                <dt className="text-sm text-gray-600">Processed</dt>
                <dd className="font-medium">
                  {format(new Date(meeting.processedAt), "MMM d, yyyy 'at' h:mm a")}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>
    </div>
  )
}

