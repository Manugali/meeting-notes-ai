import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { redirect } from "next/navigation"
import { MeetingDetailClient } from "@/components/meeting-detail-client"

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params

  const meeting = await retryDbOperation(() =>
    prisma.meeting.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      // Select only needed fields for better performance
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        summary: true,
        actionItems: true,
        keyDecisions: true,
        topics: true,
        transcript: true,
        duration: true,
        createdAt: true,
        processedAt: true,
      },
    })
  )

  if (!meeting) {
    redirect("/dashboard")
  }

  return <MeetingDetailClient initialMeeting={meeting as any} />
}

