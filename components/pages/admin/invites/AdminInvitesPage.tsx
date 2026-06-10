"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { apiCreateSignupInvite, getApiBaseUrl, type ApiError, type InviteCreateResponse } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function getErrorMessage(err: unknown) {
  if (typeof err === "object" && err != null && "message" in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
    return String(message)
  }
  return "Request failed"
}

export function AdminInvitesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [email, setEmail] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InviteCreateResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router, sessionStatus, token])

  const inviteUrl = useMemo(() => {
    if (!result) return ""
    if (typeof window === "undefined") return result.signup_path
    return `${window.location.origin}${result.signup_path}`
  }, [result])

  async function createInvite() {
    const tokenStr = token
    if (!apiBaseUrl || !tokenStr) return

    setError(null)
    setResult(null)
    setCopied(false)

    const e = email.trim().toLowerCase()
    if (!e) {
      setError("Email is required.")
      return
    }

    try {
      setCreating(true)
      const res = await apiCreateSignupInvite(apiBaseUrl, tokenStr, { email: e })
      setResult(res)
    } catch (err) {
      const apiErr = err as ApiError
      void apiErr
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function copyLink() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Failed to copy. Copy it manually from the text field.")
    }
  }

  const canCreate = useMemo(() => Boolean(apiBaseUrl && token && email.trim()), [apiBaseUrl, token, email])

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invites</h1>
        <p className="text-sm text-muted-foreground">Create invite-only signup links. Only superusers can create invites.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Create invite</CardTitle>
          <CardDescription>Generate a signup link that expires after 24 hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invite_email">
              Email
            </label>
            <Input id="invite_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </div>

          <Button type="button" onClick={createInvite} disabled={!canCreate || creating}>
            {creating ? "Creating…" : "Create invite"}
          </Button>

          {result && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Expires: <span className="font-medium text-foreground">{new Date(result.expires_at).toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="invite_url">
                  Invite URL
                </label>
                <Input id="invite_url" value={inviteUrl} readOnly />
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={copyLink}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

