import { NextResponse } from "next/server"
import { processTeamsRecording, getGraphClient } from "@/lib/teams"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { Client } from "@microsoft/microsoft-graph-client"
import "isomorphic-fetch"

/**
 * Microsoft Teams webhook endpoint
 * DISABLED: Teams integration is currently disabled
 */
export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Teams integration is currently disabled" },
    { status: 503 }
  )
  
  /* DISABLED - Teams integration
  try {
    const body = await req.json()

    // Verify webhook (Microsoft sends validation requests)
    if (body.validationToken) {
      return new NextResponse(body.validationToken, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Process notifications
    if (body.value) {
      for (const notification of body.value) {
        const resource = notification.resource

        // Check if it's a call record notification
        if (resource && resource.includes("/communications/callRecords/")) {
          const callId = resource.split("/communications/callRecords/")[1]?.split("?")[0]

          if (callId) {
            // Find user who owns this call
            const user = await findUserByCallRecord(callId)

            if (user) {
              // Get call record details using user's token
              const client = await getGraphClient(user.id)
              if (client) {
                try {
                  const callRecord = await client.api(`/communications/callRecords/${callId}`).get()

                  if (callRecord.recordingStatus === "completed") {
                    // Process the recording
                    await processTeamsRecording(user.id, callId, callRecord)
                  }
                } catch (error) {
                  console.error(`Error processing call record ${callId}:`, error)
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" })
  } catch (error: any) {
    console.error("Teams webhook error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  */
}

/**
 * Find user who owns a call record
 * We'll match by checking all users with Microsoft accounts
 */
async function findUserByCallRecord(callId: string) {
  try {
    // Get all users with Microsoft accounts
    const accounts = await retryDbOperation(() =>
      prisma.account.findMany({
        where: {
          provider: "microsoft",
        },
        include: {
          user: true,
        },
      })
    )

    // Try to find the call record for each user
    for (const account of accounts) {
      try {
        const client = await getGraphClient(account.userId)
        if (!client) continue

        const callRecord = await client.api(`/communications/callRecords/${callId}`).get()

        // If we can access it, this user owns it
        if (callRecord) {
          return account.user
        }
      } catch {
        // User doesn't have access to this call, try next
        continue
      }
    }

    return null
  } catch (error) {
    console.error("Error finding user by call record:", error)
    return null
  }
}

