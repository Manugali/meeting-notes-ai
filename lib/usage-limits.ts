import { prisma } from "./db"
import { retryDbOperation } from "./db-utils"

export interface UsageLimits {
  maxMeetings: number
  currentUsage: number
  canUpload: boolean
  planName: string
}

/**
 * Get usage limits for a user based on their subscription
 */
export async function getUserUsageLimits(userId: string): Promise<UsageLimits> {
  // Get subscription and count in parallel for better performance
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const [subscription, currentUsage] = await Promise.all([
    retryDbOperation(() =>
      prisma.subscription.findUnique({
        where: { userId },
        select: {
          status: true,
          stripePriceId: true,
        },
      })
    ),
    retryDbOperation(() =>
      prisma.meeting.count({
        where: {
          userId,
          createdAt: {
            gte: startOfMonth,
          },
        },
      })
    ),
  ])

  // Determine limits based on subscription
  let maxMeetings: number
  let planName: string

  if (!subscription || subscription.status !== "active") {
    // Free tier
    maxMeetings = 3
    planName = "Free"
  } else {
    // Get plan limits from Stripe price ID or subscription metadata
    // For now, we'll use hardcoded limits based on plan names
    const priceId = subscription.stripePriceId || ""
    
    if (priceId.includes("starter") || priceId.includes("price_starter")) {
      maxMeetings = 20
      planName = "Starter"
    } else if (priceId.includes("pro") || priceId.includes("price_pro")) {
      maxMeetings = 100
      planName = "Pro"
    } else if (priceId.includes("business") || priceId.includes("price_business")) {
      maxMeetings = 999999 // Unlimited
      planName = "Business"
    } else {
      // Default to starter if price ID doesn't match
      maxMeetings = 20
      planName = "Starter"
    }
  }

  return {
    maxMeetings,
    currentUsage,
    canUpload: currentUsage < maxMeetings,
    planName,
  }
}

/**
 * Check if user can upload a new meeting
 */
export async function canUserUpload(userId: string): Promise<{
  allowed: boolean
  reason?: string
  limits?: UsageLimits
}> {
  const limits = await getUserUsageLimits(userId)

  if (limits.canUpload) {
    return { allowed: true, limits }
  }

  return {
    allowed: false,
    reason: `You've reached your ${limits.planName} plan limit of ${limits.maxMeetings} meetings per month. Upgrade to upload more meetings.`,
    limits,
  }
}

