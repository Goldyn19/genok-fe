import type { NextAuthOptions } from "next-auth"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const runtime = "nodejs"

type BackendLoginResponse = {
  message: string
  tokens?: {
    access_token: string
    refresh_token: string
  }
}

type AuthUser = {
  id: string
  email: string
  accessToken: string
  refreshToken: string
}

function joinUrl(base: string, path: string) {
  const b = base.endsWith("/") ? base.slice(0, -1) : base
  const p = path.startsWith("/") ? path : `/${path}`
  return `${b}${p}`
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2) return null

  const base64url = parts[1]
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "===".slice((base64.length + 3) % 4)

  try {
    const json = Buffer.from(padded, "base64").toString("utf8")
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const apiBaseUrl = (process.env.BACK_END_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").trim()
        if (!apiBaseUrl) throw new Error("Missing BACK_END_URL")

        const email = credentials?.email
        const password = credentials?.password
        if (!email || !password) throw new Error("Missing credentials")

        const res = await fetch(joinUrl(apiBaseUrl, "/auth/login/"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email, password }),
        })

        const data = (await res.json().catch(() => null)) as BackendLoginResponse | null

        if (!res.ok) {
          console.log(data)
          const message = data?.message || "Invalid email or password"
          throw new Error(message)
        }

        const accessToken = data?.tokens?.access_token
        const refreshToken = data?.tokens?.refresh_token
        if (!accessToken || !refreshToken) throw new Error("Invalid login response")

        const payload = decodeJwtPayload(accessToken)
        const userId = payload?.user_id
        const id = typeof userId === "number" || typeof userId === "string" ? String(userId) : ""
        if (!id) throw new Error("Missing user id in token")

        const user: AuthUser = { id, email, accessToken, refreshToken }
        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as AuthUser
        token.id = u.id
        token.email = u.email
        token.accessToken = u.accessToken
        token.refreshToken = u.refreshToken
      }
      return token
    },
    async session({ session, token }) {
      session.user = session.user || { id: "" }
      session.user.id = (token.id as string) || ""
      session.user.email = (token.email as string) || session.user.email
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
