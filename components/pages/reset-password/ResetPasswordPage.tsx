"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import { apiResetPasswordWithToken, getApiBaseUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function getErrorMessage(err: unknown) {
  if (typeof err === "object" && err != null && "message" in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
    return String(message)
  }
  return "Password reset failed"
}

export function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = (searchParams.get("token") ?? "").trim()
  const apiBaseUrl = getApiBaseUrl()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setError(null)
    setDone(false)
    setPassword("")
    setConfirm("")
  }, [token])

  const canSubmit = useMemo(() => {
    if (!apiBaseUrl) return false
    if (!token) return false
    if (password.length < 8) return false
    if (password !== confirm) return false
    return true
  }, [apiBaseUrl, confirm, password, token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("Missing reset token.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    try {
      setSubmitting(true)
      await apiResetPasswordWithToken(apiBaseUrl, { token, new_password: password })
      setDone(true)
      setTimeout(() => router.replace("/login"), 800)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Set a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-3">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Missing reset token.</div>
              <div className="text-center text-xs text-muted-foreground">
                Go to <Link className="text-foreground underline underline-offset-4" href="/login">login</Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="new_password">
                  New password
                </label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="confirm_password">
                  Confirm password
                </label>
                <Input
                  id="confirm_password"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {done && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Password updated. Redirecting to login…</div>}

              <Button className="w-full" type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Saving..." : "Set new password"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Back to <Link className="text-foreground underline underline-offset-4" href="/login">login</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

