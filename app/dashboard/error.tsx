"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for debugging
    console.error("Dashboard error:", error)
  }, [error])

  const isConnectionError = 
    error.message?.includes("timeout") ||
    error.message?.includes("Connection") ||
    error.message?.includes("P1008")

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          {isConnectionError ? "Connection Issue" : "Something went wrong"}
        </h2>
        <p className="text-gray-600 mb-6">
          {isConnectionError
            ? "Unable to connect to the database. Please try again in a moment."
            : "An unexpected error occurred. Please try again."}
        </p>
        <div className="space-y-3">
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

