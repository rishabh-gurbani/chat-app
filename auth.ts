import NextAuth, { type DefaultSession } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/server/db/index'

declare module 'next-auth' {
  interface Session {
    user: {
      /** The user's id. */
      id: string
    } & DefaultSession['user']
  }
}

export const {
  handlers: { GET, POST },
  auth
} = NextAuth({
  providers: [GitHub],
  adapter: DrizzleAdapter(db),
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        token.id = profile.id
        token.image = profile.avatar_url || profile.picture
      }
      return token
    },
    session: ({ session, user }) => {
      if (session?.user && user?.id) {
        session.user.id = String(user.id)
      }
      return session
    },
    authorized({ auth }) {
      return !!auth?.user // this ensures there is a logged in user for -every- request
    }
  },
  pages: {
    signIn: '/sign-in' // overrides the next-auth default signin page https://authjs.dev/guides/basics/pages
  }
})
