"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import Link from "next/link"
import { format } from "date-fns"

interface Meeting {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: Date
}

interface MeetingCardProps {
  meeting: Meeting
  onDelete?: () => void
}

function getStatusColor(status: string): string {
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

export function MeetingCard({ meeting, onDelete }: MeetingCardProps) {
  const router = useRouter()
  const toast = useToast()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
      
      if (onDelete) {
        onDelete()
      } else {
        router.refresh()
      }
      setIsDeleteOpen(false)
    } catch (error: any) {
      console.error("Error deleting meeting:", error)
      toast.error(
        "Delete Failed",
        error?.message || "Failed to delete meeting. Please try again."
      )
      setIsDeleting(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{meeting.title}</h3>
            <Badge className={getStatusColor(meeting.status)}>
              {meeting.status}
            </Badge>
          </div>
          {meeting.description && (
            <p className="text-gray-600 mb-2">{meeting.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {format(new Date(meeting.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/meetings/${meeting.id}`}>
            <Button variant="outline">View</Button>
          </Link>
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon">
                🗑️
              </Button>
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
        </div>
      </div>
    </Card>
  )
}

