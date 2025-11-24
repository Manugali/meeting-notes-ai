import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { renewWebhookIfNeeded } from "@/lib/teams"

/**
 * Check if user has Microsoft Teams connected
 * Automatically renews webhook subscription if expired or expiring soon
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id || (session.user as any).sub
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 })
    }

    const account = await retryDbOperation(() =>
      prisma.account.findFirst({
        where: {
          userId,
          provider: "microsoft",
        },
        select: {
          id: true,
          expires_at: true,
          webhookExpiresAt: true,
        },
      })
    )

    const connected = !!account && (!account.expires_at || account.expires_at * 1000 > Date.now())

    // Automatically renew webhook if connected and expiring soon
    if (connected) {
      await renewWebhookIfNeeded(userId)
    }

    return NextResponse.json({ 
      connected,
      webhookActive: connected && !!account?.webhookExpiresAt && new Date(account.webhookExpiresAt) > new Date()
    })
  } catch (error: any) {
    console.error("Error checking Teams status:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

