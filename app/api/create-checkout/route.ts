import { auth } from "@/lib/auth"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  if (!isStripeConfigured()) {
    return new NextResponse(
      JSON.stringify({ error: "Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const { priceId } = await req.json()

  if (!priceId) {
    return new NextResponse("Price ID required", { status: 400 })
  }

  try {
    const checkoutSession = await stripe!.checkout.sessions.create({
      customer_email: session.user.email!,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error("Stripe error:", error)
    return new NextResponse(error.message, { status: 500 })
  }
}

