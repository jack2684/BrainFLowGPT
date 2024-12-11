import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { AuthOptions } from "next-auth"
import { supabase } from '@/lib/supabase'
import { Session } from "next-auth"
import pino from 'pino'

// Using the simplified logger configuration
const logger = pino()

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error) {
            logger.error({ error }, 'Supabase auth error')
            return null
          }

          if (user) {
            logger.info({ user }, 'User successfully authenticated')
            return {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
            }
          }

          return null
        } catch (error) {
          logger.error({ error }, 'Auth error')
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const { data: { session } } = await supabase.auth.getSession()
        token.accessToken = session?.access_token
        token.refreshToken = session?.refresh_token
        token.id = user.id
      }
      logger.info({ token }, 'JWT token created/updated')
      return token
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.id = token.id as string
      }
      logger.info({ session }, 'Session created/updated')
      return session
    },
  },
  events: {
    async signOut({ token }) {
      logger.info({ token }, 'Signing out user')
      await supabase.auth.signOut()
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } 