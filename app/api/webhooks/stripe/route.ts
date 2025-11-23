import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return new NextResponse("Stripe is not configured", { status: 500 })
  }

  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")!

  if (!signature) {
    return new NextResponse("No signature", { status: 400 })
  }

  let event

  try {
    event = stripe!.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any
    
    if (session.mode === "subscription") {
      const subscription = await stripe!.subscriptions.retrieve(session.subscription)
      
      await prisma.subscription.upsert({
        where: { userId: session.metadata.userId },
        create: {
          userId: session.metadata.userId,
          stripeCustomerId: session.customer as string,
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        update: {
          stripeCustomerId: session.customer as string,
          stripePriceId: subscription.items.data[0]?.price.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
    }
  }

  // Handle subscription updates
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any
    
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })
  }

  // Handle subscription deletions
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any
    
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      data: {
        status: "canceled",
      },
    })
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
}

