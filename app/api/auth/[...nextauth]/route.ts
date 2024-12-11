import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { AuthOptions } from "next-auth"
import { supabase } from '@/lib/supabase'
import { Session } from "next-auth"
import pino from 'pino'

// Initialize the logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  },
})

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
          logger.warn('Missing credentials')
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
            logger.info({ userId: user.id }, 'User successfully authenticated')
            return {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0],
            }
          }

          logger.warn('No user returned from Supabase')
          return null
        } catch (error) {
          logger.error({ error }, "Authentication error")
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          logger.error({ error }, 'Error getting Supabase session')
        }
        token.accessToken = session?.access_token
        token.refreshToken = session?.refresh_token
        token.id = user.id
        logger.info({ userId: user.id }, 'JWT token created/updated')
      }
      return token
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.id = token.id as string
        logger.info({ userId: session.user.id }, 'Session created/updated')
      }
      return session
    },
  },
  events: {
    async signOut({ token }) {
      await supabase.auth.signOut()
      logger.info({ userId: token.id }, 'User signed out')
    },
    async signIn({ user }) {
      logger.info({ userId: user.id }, 'User signed in')
    },
    async error(error) {
      logger.error({ error }, 'Authentication error occurred')
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