"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toaster"
import { CheckCircleIcon, XCircleIcon, RefreshCwIcon } from "lucide-react"

interface TeamsConnectionCardProps {
  userId: string
}

export function TeamsConnectionCard({ userId }: TeamsConnectionCardProps) {
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const hasProcessedRedirect = useRef(false) // Track if we've already processed the redirect message

  // Check connection status
  useEffect(() => {
    checkConnection()
  }, [userId])

  // Handle redirect messages (only once)
  useEffect(() => {
    // Skip if we've already processed or if there's no redirect message
    if (hasProcessedRedirect.current) return
    
    const teamsParam = searchParams.get("teams")
    const errorParam = searchParams.get("error")
    
    if (teamsParam === "connected") {
      hasProcessedRedirect.current = true
      toast.success("Teams Connected", "Your Microsoft Teams account is now connected!")
      // Clean up URL after a short delay to ensure toast is shown
      setTimeout(() => {
        router.replace("/dashboard")
      }, 100)
    } else if (errorParam) {
      hasProcessedRedirect.current = true
      toast.error("Connection Failed", errorParam || "Failed to connect Microsoft Teams. Please try again.")
      // Clean up URL after a short delay
      setTimeout(() => {
        router.replace("/dashboard")
      }, 100)
    }
  }, [searchParams, toast, router])

  const checkConnection = async () => {
    try {
      const response = await fetch("/api/teams/status")
      if (response.ok) {
        const data = await response.json()
        setIsConnected(data.connected)
      }
    } catch (error) {
      console.error("Error checking Teams connection:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/connect-teams")
      if (!response.ok) {
        throw new Error("Failed to initiate connection")
      }

      const { authUrl } = await response.json()
      if (authUrl) {
        // Redirect to Microsoft OAuth
        window.location.href = authUrl
      }
    } catch (error: any) {
      toast.error(
        "Connection Failed",
        error.message || "Failed to connect Microsoft Teams. Please try again."
      )
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/teams/sync", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to sync meetings" }))
        throw new Error(errorData.message || errorData.error || "Failed to sync meetings")
      }

      const data = await response.json()
      
      if (data.processed > 0) {
        toast.success(
          "Meetings Synced",
          `Found ${data.total} meetings, processed ${data.processed} new recordings.`
        )
        // Refresh the page to show new meetings
        setTimeout(() => {
          router.refresh()
        }, 1000)
      } else {
        toast.info(
          "No New Meetings",
          `Found ${data.total} meetings, but no new recordings to process.`
        )
      }
    } catch (error: any) {
      console.error("Error syncing meetings:", error)
      
      // Show helpful message for permission errors
      const errorMessage = error.message || "Failed to sync Teams meetings. Please try again."
      const isPermissionError = errorMessage.includes("Application permissions") || 
                                errorMessage.includes("Permission denied") ||
                                errorMessage.includes("not available")
      
      toast.error(
        "Sync Not Available",
        isPermissionError 
          ? "Manual sync requires Application permissions. Automatic processing via webhooks will work in production with HTTPS."
          : errorMessage
      )
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold">Microsoft Teams Integration</h2>
            {isConnected ? (
              <Badge className="bg-green-600">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">
                <XCircleIcon className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {isConnected
              ? "Your Teams meetings will be automatically processed when recordings are available via webhooks (requires HTTPS in production). Manual sync requires Application permissions."
              : "Connect your Microsoft Teams account to automatically process meeting recordings. No manual upload needed!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              className="ml-4"
            >
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Meetings"}
            </Button>
          )}
          {!isConnected && (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="ml-4"
            >
              {isConnecting ? "Connecting..." : "Connect Teams"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

