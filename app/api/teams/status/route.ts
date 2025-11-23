import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { retryDbOperation } from "@/lib/db-utils"

/**
 * Check if user has Microsoft Teams connected
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const account = await retryDbOperation(() =>
      prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: "microsoft",
        },
        select: {
          id: true,
          expires_at: true,
        },
      })
    )

    const connected = !!account && (!account.expires_at || account.expires_at * 1000 > Date.now())

    return NextResponse.json({ connected })
  } catch (error: any) {
    console.error("Error checking Teams status:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

