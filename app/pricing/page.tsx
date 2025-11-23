"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toaster"
import Link from "next/link"

const plans = [
  {
    name: "Starter",
    price: "$29",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "price_starter",
    features: [
      "20 meetings/month",
      "Up to 2 hours per meeting",
      "AI summaries",
      "Action items extraction",
      "Key decisions tracking",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$79",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro",
    features: [
      "100 meetings/month",
      "Unlimited meeting length",
      "Everything in Starter",
      "Advanced AI analysis",
      "Speaker identification",
      "Integrations (Zoom, Teams)",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "$199",
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || "price_business",
    features: [
      "Unlimited meetings",
      "Everything in Pro",
      "Team collaboration",
      "Custom integrations",
      "API access",
      "Dedicated support",
      "Custom AI prompts",
    ],
  },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const toast = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (priceId: string) => {
    if (!session) {
      window.location.href = "/login?callbackUrl=/pricing"
      return
    }

    setLoading(priceId)
    
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to create checkout" }))
        throw new Error(errorData.error || "Failed to create checkout")
      }
      
      const { url } = await res.json()
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No checkout URL received")
      }
    } catch (error: any) {
      console.error(error)
      const errorMessage = error?.message || "Something went wrong. Please try again."
      
      if (errorMessage.includes("Stripe") || errorMessage.includes("configured")) {
        toast.error(
          "Payment Unavailable",
          "Stripe is not configured. Please contact support or try again later."
        )
      } else {
        toast.error(
          "Subscription Failed",
          errorMessage
        )
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Meeting Notes AI
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that works for you</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-8 relative ${plan.popular ? "border-2 border-blue-600 shadow-lg" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute top-4 right-4 bg-blue-600">Most Popular</Badge>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.priceId)}
                disabled={loading === plan.priceId}
              >
                {loading === plan.priceId ? "Loading..." : "Subscribe"}
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
        </div>
      </div>
    </div>
  )
}

