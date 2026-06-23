"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { apiCreatePasswordResetLink, apiSearchUsers, getApiBaseUrl, type ApiError, type PasswordResetCreateResponse, type RbacUser } from "@/lib/api"
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

export function AdminPasswordResetsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [email, setEmail] = useState("")
  const [userQuery, setUserQuery] = useState("")
  const [userResults, setUserResults] = useState<RbacUser[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<RbacUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PasswordResetCreateResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router, sessionStatus, token])

  useEffect(() => {
    const tokenStr = token
    if (!apiBaseUrl || !tokenStr) return

    const q = userQuery.trim()
    if (q.length < 2) {
      setUserResults([])
      setUserLoading(false)
      return
    }

    let cancelled = false
    const t = setTimeout(() => {
      ;(async () => {
        try {
          setUserLoading(true)
          const data = await apiSearchUsers(apiBaseUrl, tokenStr, q)
          if (!cancelled) setUserResults(data)
        } catch (e) {
          if (!cancelled) {
            setUserResults([])
            setError(getErrorMessage(e))
          }
        } finally {
          if (!cancelled) setUserLoading(false)
        }
      })()
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [apiBaseUrl, token, userQuery])

  const resetUrl = useMemo(() => {
    if (!result) return ""
    if (typeof window === "undefined") return result.reset_path
    return `${window.location.origin}${result.reset_path}`
  }, [result])

  async function createResetLink() {
    const tokenStr = token
    if (!apiBaseUrl || !tokenStr) return

    setError(null)
    setResult(null)
    setCopied(false)

    const e = (selectedUser?.email || email).trim().toLowerCase()
    if (!e) {
      setError("Email is required.")
      return
    }

    try {
      setCreating(true)
      const res = await apiCreatePasswordResetLink(apiBaseUrl, tokenStr, { email: e })
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
    if (!resetUrl) return
    try {
      await navigator.clipboard.writeText(resetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Failed to copy. Copy it manually from the text field.")
    }
  }

  const canCreate = useMemo(
    () => Boolean(apiBaseUrl && token && ((selectedUser?.email ?? "").trim() || email.trim())),
    [apiBaseUrl, email, selectedUser?.email, token]
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Password reset</h1>
        <p className="text-sm text-muted-foreground">Create 30-minute password reset links. Superusers only.</p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Create reset link</CardTitle>
          <CardDescription>Generate a reset link that expires after 30 minutes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Select user</div>
            <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search by email or name..." />
            <div className="max-h-56 overflow-auto rounded-md border">
              {userLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Searching…</div>
              ) : userQuery.trim().length < 2 ? (
                <div className="p-3 text-sm text-muted-foreground">Type at least 2 characters to search.</div>
              ) : userResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No results.</div>
              ) : (
                userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u)
                      setEmail(u.email)
                    }}
                    className={`flex w-full items-start justify-between gap-2 border-b p-3 text-left last:border-b-0 ${
                      selectedUser?.id === u.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {u.full_name || u.email} {!u.is_active ? <span className="text-xs text-muted-foreground">(Inactive)</span> : null}
                      </div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{selectedUser?.id === u.id ? "Selected" : ""}</div>
                  </button>
                ))
              )}
            </div>
            {selectedUser && (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{selectedUser.full_name || selectedUser.email}</div>
                  <div className="truncate text-muted-foreground">{selectedUser.email}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null)
                    setEmail("")
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reset_email">
              User email
            </label>
            <Input id="reset_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </div>

          <Button type="button" onClick={createResetLink} disabled={!canCreate || creating}>
            {creating ? "Creating…" : "Create reset link"}
          </Button>

          {result && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                Expires: <span className="font-medium text-foreground">{new Date(result.expires_at).toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="reset_url">
                  Reset URL
                </label>
                <Input id="reset_url" value={resetUrl} readOnly />
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
