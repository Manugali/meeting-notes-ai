import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { getUserUsageLimits } from "@/lib/usage-limits"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MeetingCard } from "@/components/meeting-card"
import { format } from "date-fns"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  // Run all queries in parallel for faster page load
  // Use Promise.allSettled to handle partial failures gracefully
  const [meetingsResult, subscriptionResult, usageLimitsResult] = await Promise.allSettled([
    retryDbOperation(() =>
      prisma.meeting.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          createdAt: true,
        },
      })
    ),
    retryDbOperation(() =>
      prisma.subscription.findUnique({
        where: { userId: session.user.id },
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      })
    ),
    getUserUsageLimits(session.user.id),
  ])

  // Extract results or use defaults
  const meetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value : []
  const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null
  const usageLimits = usageLimitsResult.status === 'fulfilled' 
    ? usageLimitsResult.value 
    : { maxMeetings: 3, currentUsage: 0, canUpload: true, planName: 'Free' }

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
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Meeting Notes AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
            <Link href="/api/auth/signout">
              <Button variant="outline">Sign Out</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {session.user.email}</p>
        </div>

        {/* Subscription Status */}
        {subscription ? (
          <Card className="p-6 mb-8 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Active Subscription</h3>
                <p className="text-sm text-green-700">
                  Status: {subscription.status} 
                  {subscription.currentPeriodEnd && (
                    <> • Renews: {format(subscription.currentPeriodEnd, "MMM d, yyyy")}</>
                  )}
                </p>
              </div>
              <Badge className="bg-green-600">Active</Badge>
            </div>
          </Card>
        ) : (
          <Card className="p-6 mb-8 bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">No Active Subscription</h3>
                <p className="text-sm text-yellow-700">Upgrade to process meetings</p>
              </div>
              <Link href="/pricing">
                <Button>View Plans</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Upload Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upload Meeting Recording</h2>
            <Badge variant="outline">
              {usageLimits.currentUsage} / {usageLimits.maxMeetings === 999999 ? "∞" : usageLimits.maxMeetings} meetings
            </Badge>
          </div>
          {usageLimits.canUpload ? (
            <Link href="/dashboard/upload">
              <Button className="w-full">Upload New Meeting</Button>
            </Link>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-orange-600">
                You've reached your {usageLimits.planName} plan limit. Upgrade to upload more meetings.
              </p>
              <Link href="/pricing">
                <Button className="w-full" variant="outline">Upgrade Plan</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Meetings List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Meetings</h2>
          {meetings.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600 mb-4">No meetings yet</p>
              <Link href="/dashboard/upload">
                <Button>Upload Your First Meeting</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

