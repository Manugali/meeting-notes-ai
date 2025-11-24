import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { renewWebhookIfNeeded, getGraphClient, subscribeToTeamsRecordings } from "@/lib/teams"

/**
 * Test endpoint to verify Teams connection and webhook status
 * Shows all relevant data for debugging
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

    // Get user info
    const user = await retryDbOperation(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      })
    )

    // Get Microsoft account info
    const account = await retryDbOperation(() =>
      prisma.account.findFirst({
        where: {
          userId,
          provider: "microsoft",
        },
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          expires_at: true,
          webhookSubscriptionId: true,
          webhookExpiresAt: true,
          scope: true,
        },
      })
    )

    // Check if OAuth token is valid
    const tokenValid = account && (!account.expires_at || account.expires_at * 1000 > Date.now())
    
    // Check if webhook is active
    const webhookActive = account?.webhookExpiresAt && new Date(account.webhookExpiresAt) > new Date()
    const webhookExpiresIn = account?.webhookExpiresAt 
      ? Math.floor((new Date(account.webhookExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    // Try to get Graph client (tests token validity)
    let graphClientTest = false
    let graphClientError = null
    try {
      const client = await getGraphClient(userId)
      graphClientTest = client !== null
    } catch (error: any) {
      graphClientError = error.message
    }

    // Check webhook renewal (or create if missing)
    let webhookRenewed = false
    let webhookCreated = false
    
    if (account && tokenValid) {
      // If webhook doesn't exist, create it
      if (!account.webhookSubscriptionId || !account.webhookExpiresAt) {
        console.log(`[Teams] Webhook missing for user ${userId}, creating...`)
        const subscriptionId = await subscribeToTeamsRecordings(userId)
        webhookCreated = subscriptionId !== null
      } else {
        // Otherwise, just renew if needed
        webhookRenewed = await renewWebhookIfNeeded(userId)
      }
    }
    
    // Get updated account after renewal
    const updatedAccount = await retryDbOperation(() =>
      prisma.account.findFirst({
        where: {
          userId,
          provider: "microsoft",
        },
        select: {
          webhookSubscriptionId: true,
          webhookExpiresAt: true,
        },
      })
    )

    // Get Teams meetings count
    const teamsMeetingsCount = await retryDbOperation(() =>
      prisma.meeting.count({
        where: {
          userId,
          source: "teams",
        },
      })
    )

    return NextResponse.json({
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        createdAt: user?.createdAt,
      },
      teamsConnection: {
        connected: !!account,
        tokenValid,
        accountId: account?.id,
        providerAccountId: account?.providerAccountId,
        tokenExpiresAt: account?.expires_at 
          ? new Date(account.expires_at * 1000).toISOString()
          : null,
        tokenExpiresIn: account?.expires_at
          ? Math.floor((account.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        scopes: account?.scope?.split(" ") || [],
      },
      webhook: {
        subscriptionId: account?.webhookSubscriptionId || updatedAccount?.webhookSubscriptionId,
        expiresAt: account?.webhookExpiresAt || updatedAccount?.webhookExpiresAt,
        expiresInDays: updatedAccount?.webhookExpiresAt
          ? Math.floor((new Date(updatedAccount.webhookExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : webhookExpiresIn,
        isActive: webhookActive || (updatedAccount?.webhookExpiresAt && new Date(updatedAccount.webhookExpiresAt) > new Date()),
        wasRenewed: webhookRenewed,
        wasCreated: webhookCreated,
      },
      graphApi: {
        clientAccessible: graphClientTest,
        error: graphClientError,
      },
      meetings: {
        teamsMeetingsCount,
      },
      summary: {
        status: account && tokenValid ? "✅ Connected" : "❌ Not Connected",
        webhookStatus: webhookActive || (updatedAccount?.webhookExpiresAt && new Date(updatedAccount.webhookExpiresAt) > new Date())
          ? "✅ Active"
          : "❌ Expired/Not Set",
        canReceiveWebhooks: account && tokenValid && (webhookActive || (updatedAccount?.webhookExpiresAt && new Date(updatedAccount.webhookExpiresAt) > new Date())),
      },
    })
  } catch (error: any) {
    console.error("Error testing Teams connection:", error)
    return NextResponse.json(
      { 
        error: "Test failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

