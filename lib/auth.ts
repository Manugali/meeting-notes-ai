import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"
import { retryDbOperation } from "./db-utils"
// import EmailProvider from "next-auth/providers/email" // Commented out - requires nodemailer and email server
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import NextAuth from "next-auth"

export const authOptions = {
  // Don't use adapter with JWT strategy and credentials provider
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt" as const,
  },
  providers: [
    // Development credentials provider - for testing without email/Google
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
      },
          async authorize(credentials: any) {
            try {
              const email = credentials?.email as string | undefined
              if (!email) return null
              
              // Use retry for auth operations (1 retry with short delay)
              let user = await retryDbOperation(
                () =>
                  prisma.user.findUnique({
                    where: { email },
                  }),
                1, // 1 retry for auth
                200, // 200ms delay
                true // Fast mode enabled
              )
              
              if (!user) {
                user = await retryDbOperation(
                  () =>
                    prisma.user.create({
                      data: {
                        email,
                        name: email.split("@")[0],
                      },
                    }),
                  1, // 1 retry for auth
                  200, // 200ms delay
                  true // Fast mode enabled
                )
              }
              
              return {
                id: user.id,
                email: user.email,
                name: user.name,
              }
            } catch (error: any) {
              console.error("Auth error:", error)
              
              // Check if it's a connection error
              const isConnectionError = 
                error.message?.includes("timeout") ||
                error.message?.includes("Connection") ||
                error.code === "P1008" ||
                error.code === "ETIMEDOUT"
              
              if (isConnectionError) {
                // Return a more specific error for connection issues
                throw new Error("Database connection timeout. Please try again in a moment.")
              }
              
              return null
            }
          },
    }),
    // EmailProvider temporarily disabled - uncomment when email server is configured
    // EmailProvider({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: Number(process.env.EMAIL_SERVER_PORT),
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }: any) {
      try {
        if (session?.user && token?.sub) {
          session.user.id = token.sub
        }
        return session
      } catch (error) {
        console.error("Session callback error:", error)
        return session
      }
    },
    async jwt({ token, user }: any) {
      try {
        if (user) {
          token.sub = user.id
        }
        return token
      } catch (error) {
        console.error("JWT callback error:", error)
        return token
      }
    },
  },
}

// Create NextAuth instance and export auth function and handlers
const nextAuth = NextAuth(authOptions)
export const { auth, handlers } = nextAuth

