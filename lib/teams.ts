/**
 * Microsoft Teams integration using Microsoft Graph API
 * Handles OAuth, webhook subscriptions, and recording access
 */

import { Client } from "@microsoft/microsoft-graph-client"
import "isomorphic-fetch"
import { ConfidentialClientApplication } from "@azure/msal-node"
import { prisma } from "./db"
import { retryDbOperation } from "./db-utils"

// Initialize MSAL for server-side authentication
let msalClient: ConfidentialClientApplication | null = null

function getMsalClient() {
  if (!msalClient) {
    if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET || !process.env.AZURE_TENANT_ID) {
      throw new Error("Azure credentials not configured")
    }

    // Use 'common' endpoint to support both organizational and personal Microsoft accounts
    const tenantId = process.env.AZURE_TENANT_ID === 'common' || 
                     process.env.AZURE_TENANT_ID === 'organizations' ||
                     process.env.AZURE_TENANT_ID === 'consumers'
                     ? process.env.AZURE_TENANT_ID
                     : 'common' // Default to 'common' for multi-tenant with personal accounts

    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    })
  }
  return msalClient
}

/**
 * Get Microsoft Graph client for a user
 */
export async function getGraphClient(userId: string): Promise<Client | null> {
  try {
    // Get user's Microsoft account (stored in Account table)
    const account = await retryDbOperation(() =>
      prisma.account.findFirst({
        where: {
          userId,
          provider: "microsoft",
        },
        select: {
          access_token: true,
          refresh_token: true,
          expires_at: true,
        },
      })
    )

    if (!account?.access_token) {
      return null
    }

    // Check if token is expired
    const isExpired = account.expires_at && account.expires_at * 1000 < Date.now()

    let accessToken = account.access_token

    // Refresh token if expired
    if (isExpired && account.refresh_token) {
      accessToken = await refreshAccessToken(userId, account.refresh_token)
    }

    // Create Graph client
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })

    return client
  } catch (error) {
    console.error("Error getting Graph client:", error)
    return null
  }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  try {
    const msal = getMsalClient()
    
    // Use refresh token to get new access token
    const result = await msal.acquireTokenByRefreshToken({
      refreshToken,
      scopes: ["https://graph.microsoft.com/.default"],
    })

    if (!result?.accessToken) {
      throw new Error("Failed to refresh token")
    }

    // Update stored token
    await retryDbOperation(() =>
      prisma.account.updateMany({
        where: {
          userId,
          provider: "microsoft",
        },
        data: {
          access_token: result.accessToken,
          expires_at: result.expiresOn ? Math.floor(result.expiresOn.getTime() / 1000) : null,
        },
      })
    )

    return result.accessToken
  } catch (error) {
    console.error("Error refreshing token:", error)
    throw error
  }
}

/**
 * Subscribe to Teams call recording webhooks
 */
export async function subscribeToTeamsRecordings(userId: string): Promise<string | null> {
  try {
    const client = await getGraphClient(userId)
    if (!client) {
      throw new Error("Failed to get Graph client")
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/teams`
    
    // Subscribe to communications webhooks
    const subscription = await client
      .api("/subscriptions")
      .post({
        changeType: "created,updated",
        notificationUrl: webhookUrl,
        resource: "/communications/callRecords",
        expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        clientState: `teams-${userId}`,
      })

    return subscription.id
  } catch (error) {
    console.error("Error subscribing to Teams recordings:", error)
    return null
  }
}

/**
 * Get Teams call recording download URL
 */
export async function getTeamsRecordingUrl(
  userId: string,
  callId: string
): Promise<string | null> {
  try {
    const client = await getGraphClient(userId)
    if (!client) {
      throw new Error("Failed to get Graph client")
    }

    // Get call record
    const callRecord = await client.api(`/communications/callRecords/${callId}`).get()

    // Get recording sessions
    const sessions = await client
      .api(`/communications/callRecords/${callId}/sessions`)
      .get()

    // Find recording content
    for (const session of sessions.value || []) {
      const recordings = await client
        .api(`/communications/callRecords/${callId}/sessions/${session.id}/recordings`)
        .get()

      for (const recording of recordings.value || []) {
        // Get recording content download URL
        const content = await client
          .api(`/communications/callRecords/${callId}/sessions/${session.id}/recordings/${recording.id}/content`)
          .get()

        if (content?.recordingContentUrl) {
          return content.recordingContentUrl
        }
      }
    }

    return null
  } catch (error) {
    console.error("Error getting Teams recording URL:", error)
    return null
  }
}

/**
 * Process Teams recording when webhook fires
 */
export async function processTeamsRecording(
  userId: string,
  callId: string,
  callRecord: any
): Promise<void> {
  try {
    // Get recording URL
    const recordingUrl = await getTeamsRecordingUrl(userId, callId)

    if (!recordingUrl) {
      console.warn(`No recording URL found for call ${callId}`)
      return
    }

    // Create meeting record
    const meeting = await retryDbOperation(() =>
      prisma.meeting.create({
        data: {
          userId,
          title: callRecord.subject || `Teams Meeting - ${new Date(callRecord.startDateTime).toLocaleDateString()}`,
          description: `Teams call from ${callRecord.startDateTime}`,
          recordingUrl,
          source: "teams",
          teamsCallId: callId,
          status: "pending",
          metadata: {
            participants: callRecord.participants,
            startTime: callRecord.startDateTime,
            endTime: callRecord.endDateTime,
            duration: callRecord.duration,
          },
        },
      })
    )

    // Start processing
    const { processMeeting } = await import("./ai")
    processMeeting(meeting.id).catch((error) => {
      console.error(`Error processing Teams meeting ${meeting.id}:`, error)
    })
  } catch (error) {
    console.error("Error processing Teams recording:", error)
    throw error
  }
}

/**
 * Fetch recent Teams call records for a user
 * This is used for manual syncing (testing without webhooks)
 */
export async function fetchRecentCallRecords(
  userId: string,
  daysBack: number = 7
): Promise<any[]> {
  try {
    const client = await getGraphClient(userId)
    if (!client) {
      throw new Error("Failed to get Graph client")
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Fetch call records from the last N days
    // Note: This requires CallRecords.Read.All permission
    // Note: $top and $orderby are not supported on this endpoint, so we fetch and filter in code
    const allRecords: any[] = []
    let nextLink: string | undefined = undefined
    
    do {
      let response: any
      
      if (nextLink) {
        // Use nextLink for pagination (don't apply filter again)
        response = await client.api(nextLink).get()
      } else {
        // First request - try with filter, but it might not work
        try {
          response = await client
            .api("/communications/callRecords")
            .filter(`startDateTime ge ${startDate.toISOString()}`)
            .get()
        } catch (filterError: any) {
          // If filter fails, fetch without filter and filter in code
          console.warn("Filter not supported, fetching all and filtering in code:", filterError.message)
          response = await client.api("/communications/callRecords").get()
        }
      }
      
      if (response.value) {
        allRecords.push(...response.value)
      }
      
      // Check for next page
      nextLink = response['@odata.nextLink']
      
      // Limit to prevent too many requests (safety limit)
      if (allRecords.length > 200) {
        break
      }
    } while (nextLink)

    // Filter by date in code (in case API filter didn't work) and sort
    const startTime = startDate.getTime()
    const filtered = allRecords.filter((record) => {
      if (!record.startDateTime) return false
      const recordTime = new Date(record.startDateTime).getTime()
      return recordTime >= startTime
    })

    // Sort by startDateTime descending (most recent first) and limit to 50
    const sorted = filtered
      .sort((a, b) => {
        const dateA = new Date(a.startDateTime).getTime()
        const dateB = new Date(b.startDateTime).getTime()
        return dateB - dateA // Descending
      })
      .slice(0, 50) // Limit to 50 most recent

    return sorted
  } catch (error: any) {
    console.error("Error fetching call records:", error)
    
    // If permission denied, provide helpful error
    if (error.statusCode === 403 || error.code === "Forbidden") {
      throw new Error(
        "Manual sync is not available with current permissions. " +
        "CallRecords.Read.All requires Application permissions (not Delegated). " +
        "Automatic processing via webhooks will work in production with HTTPS."
      )
    }
    
    throw error
  }
}

/**
 * Sync Teams meetings manually (for testing)
 * Fetches recent call records and processes any with recordings
 */
export async function syncTeamsMeetings(userId: string): Promise<{
  total: number
  processed: number
  errors: string[]
}> {
  const errors: string[] = []
  let processed = 0

  try {
    // Fetch recent call records
    const callRecords = await fetchRecentCallRecords(userId, 7) // Last 7 days

    // Check which meetings we already have
    const existingMeetings = await retryDbOperation(() =>
      prisma.meeting.findMany({
        where: {
          userId,
          source: "teams",
          teamsCallId: { not: null },
        },
        select: {
          teamsCallId: true,
        },
      })
    )

    const existingCallIds = new Set(
      existingMeetings.map((m) => m.teamsCallId).filter(Boolean)
    )

    // Process each call record
    for (const callRecord of callRecords) {
      try {
        // Skip if we already have this meeting
        if (existingCallIds.has(callRecord.id)) {
          continue
        }

        // Only process if recording is available
        if (callRecord.recordingStatus !== "completed") {
          continue
        }

        // Process the recording
        await processTeamsRecording(userId, callRecord.id, callRecord)
        processed++
      } catch (error: any) {
        const errorMsg = `Failed to process call ${callRecord.id}: ${error.message}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    return {
      total: callRecords.length,
      processed,
      errors,
    }
  } catch (error: any) {
    console.error("Error syncing Teams meetings:", error)
    throw error
  }
}

