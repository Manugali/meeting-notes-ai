import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

/**
 * Initiate Microsoft Teams OAuth flow
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user ID from session (could be in id or sub)
    const userId = (session.user as any).id || (session.user as any).sub
    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 401 })
    }

    if (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_TENANT_ID) {
      return NextResponse.json(
        { error: "Microsoft Teams integration not configured" },
        { status: 500 }
      )
    }

    // Build OAuth URL
    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/microsoft`
    )

    // Use only delegated permissions (CallRecords.Read.All is Application-only)
    // Microsoft Graph scopes format: https://graph.microsoft.com/PermissionName
    // offline_access is a standard OAuth scope (no prefix needed)
    const scopes = encodeURIComponent(
      "https://graph.microsoft.com/OnlineMeetings.Read https://graph.microsoft.com/User.Read offline_access"
    )

    const state = encodeURIComponent(userId) // Store user ID in state

    // Use 'common' for multi-tenant apps that support personal Microsoft accounts
    // This allows both organizational and personal accounts to sign in
    // If you only want organizational accounts, use process.env.AZURE_TENANT_ID
    const tenantId = process.env.AZURE_TENANT_ID === 'common' || 
                     process.env.AZURE_TENANT_ID === 'organizations' ||
                     process.env.AZURE_TENANT_ID === 'consumers'
                     ? process.env.AZURE_TENANT_ID
                     : 'common' // Default to 'common' for multi-tenant with personal accounts

    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${process.env.AZURE_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `response_mode=query&` +
      `scope=${scopes}&` +
      `state=${state}`

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error("Connect Teams error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

