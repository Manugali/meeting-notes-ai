import { NextResponse } from "next/server"
import { ConfidentialClientApplication } from "@azure/msal-node"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"
import { auth } from "@/lib/auth"

/**
 * Microsoft OAuth callback
 * Handles the OAuth flow and stores tokens
 */
export async function GET(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.redirect(`${baseUrl}/login?error=Unauthorized`)
    }

    // Get user ID from session (could be in id or sub)
    const userId = (session.user as any).id || (session.user as any).sub
    if (!userId) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=User ID not found in session`)
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=No authorization code`)
    }

    // Exchange code for tokens
    // Use 'common' endpoint to support both organizational and personal Microsoft accounts
    // The authorization code was issued by /common endpoint, so we must use /common here too
    const tenantId = process.env.AZURE_TENANT_ID === 'common' || 
                     process.env.AZURE_TENANT_ID === 'organizations' ||
                     process.env.AZURE_TENANT_ID === 'consumers'
                     ? process.env.AZURE_TENANT_ID
                     : 'common' // Default to 'common' for multi-tenant with personal accounts
    
    const msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    })

    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/microsoft`,
      scopes: [
        "https://graph.microsoft.com/OnlineMeetings.Read",
        "https://graph.microsoft.com/User.Read",
        "offline_access", // Standard OAuth scope, no prefix needed
      ],
    })

    if (!tokenResponse?.account) {
      return NextResponse.redirect(`${baseUrl}/dashboard?error=Failed to get account`)
    }

    // TypeScript: account is guaranteed to exist after the check above
    const account = tokenResponse.account

    // MSAL may not expose refreshToken directly, but we can get it from the token cache
    // For now, we'll store null and handle refresh through MSAL's token cache
    // The refresh token is managed internally by MSAL
    const refreshToken = (tokenResponse as any).refreshToken || null

    // Store or update account with retry logic for connection timeouts
    // Use 3 retries with 500ms delay for OAuth callback (critical operation)
    await retryDbOperation(
      () =>
        prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: "microsoft",
              providerAccountId: account.homeAccountId,
            },
          },
          create: {
            userId: userId,
            type: "oauth",
            provider: "microsoft",
            providerAccountId: account.homeAccountId,
            access_token: tokenResponse.accessToken,
            refresh_token: refreshToken || undefined,
            expires_at: tokenResponse.expiresOn
              ? Math.floor(tokenResponse.expiresOn.getTime() / 1000)
              : null,
            token_type: "Bearer",
            scope: tokenResponse.scopes?.join(" "),
          },
          update: {
            access_token: tokenResponse.accessToken,
            refresh_token: refreshToken || undefined,
            expires_at: tokenResponse.expiresOn
              ? Math.floor(tokenResponse.expiresOn.getTime() / 1000)
              : null,
            token_type: "Bearer",
            scope: tokenResponse.scopes?.join(" "),
          },
        }),
      3, // 3 retries
      500, // 500ms delay
      false // Not fast mode - use exponential backoff
    )

    // Subscribe to webhooks (non-blocking - will handle separately if needed)
    try {
      const { subscribeToTeamsRecordings } = await import("@/lib/teams")
      const result = await subscribeToTeamsRecordings(session.user.id)
      if (result.error) {
        console.warn("Webhook subscription failed:", result.error)
        // Don't fail the OAuth flow if webhook subscription fails
        // This is expected for personal Microsoft accounts (MSA)
      }
    } catch (webhookError) {
      console.warn("Webhook subscription failed (will retry later):", webhookError)
      // Don't fail the OAuth flow if webhook subscription fails
    }

    return NextResponse.redirect(`${baseUrl}/dashboard?teams=connected`)
  } catch (error: any) {
    console.error("Microsoft OAuth error:", error)
    return NextResponse.redirect(`${baseUrl}/dashboard?error=${encodeURIComponent(error.message || "OAuth failed")}`)
  }
}

