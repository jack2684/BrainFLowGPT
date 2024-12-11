import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      // Extend it with any additional fields you need
      // name and email are already included in DefaultSession
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    // Add other properties you need
  }
}

// You can also extend the JWT if needed
declare module "next-auth/jwt" {
  interface JWT {
    id: string
    accessToken?: string
    refreshToken?: string
  }
} 