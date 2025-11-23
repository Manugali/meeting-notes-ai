import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Meeting Notes AI
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/pricing">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Never Miss a Meeting Detail Again
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Automatically transcribe and summarize your meetings with AI. Get key insights, action items, and decisions in minutes—not hours.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/pricing">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Why Meeting Notes AI?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Get summaries in 2-5 minutes, not hours. Process a 1-hour meeting in the time it takes to grab coffee.
            </p>
          </Card>
          <Card className="p-6">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Not just transcription—intelligent summaries, action items, key decisions, and sentiment analysis.
            </p>
          </Card>
          <Card className="p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600">
              Your meetings are encrypted and secure. We never share your data. GDPR compliant.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 bg-gray-50 rounded-lg">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold mb-2">Upload Recording</h3>
            <p className="text-sm text-gray-600">Upload your meeting audio or video file</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold mb-2">AI Processing</h3>
            <p className="text-sm text-gray-600">Our AI transcribes and analyzes your meeting</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold mb-2">Get Summary</h3>
            <p className="text-sm text-gray-600">Receive organized summary with insights</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              4
            </div>
            <h3 className="font-semibold mb-2">Share & Export</h3>
            <p className="text-sm text-gray-600">Share with team or export to your tools</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Save Hours Every Week?</h2>
        <p className="text-gray-600 mb-8">Join thousands of professionals who never miss a meeting detail.</p>
        <Link href="/pricing">
          <Button size="lg" className="text-lg px-8">
            Get Started Free
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Meeting Notes AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
