"use client"

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import { apiSignupWithInvite, apiValidateSignupInvite, getApiBaseUrl, type ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type FormState = {
  first_name: string
  last_name: string
  email: string
  password: string
  password2: string
}

function getErrorMessage(err: unknown) {
  if (typeof err === "object" && err != null && "message" in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
    return String(message)
  }
  return "Request failed"
}

export function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = (searchParams.get("token") || "").trim()

  const apiBaseUrl = getApiBaseUrl()

  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteValid, setInviteValid] = useState(false)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password2: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!apiBaseUrl) return
    if (!token) {
      setInviteValid(false)
      setInviteEmail(null)
      setInviteExpiresAt(null)
      setInviteError("Missing invite token.")
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setInviteLoading(true)
        setInviteError(null)
        const res = await apiValidateSignupInvite(apiBaseUrl, token)
        if (cancelled) return
        if (!res.valid) {
          setInviteValid(false)
          setInviteEmail(null)
          setInviteExpiresAt(null)
          setInviteError("This invite link is invalid or has expired.")
          return
        }
        setInviteValid(true)
        setInviteEmail(res.email ?? null)
        setInviteExpiresAt(res.expires_at ?? null)
        if (res.email) setForm((p) => ({ ...p, email: res.email || "" }))
      } catch (e) {
        if (cancelled) return
        setInviteValid(false)
        setInviteEmail(null)
        setInviteExpiresAt(null)
        setInviteError(getErrorMessage(e))
      } finally {
        if (!cancelled) setInviteLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, token])

  const canSubmit = useMemo(() => {
    if (!inviteValid) return false
    if (!form.first_name.trim() || !form.last_name.trim()) return false
    if (!form.email.trim()) return false
    if (!form.password || form.password.length < 8) return false
    if (form.password !== form.password2) return false
    return true
  }, [form, inviteValid])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!apiBaseUrl) {
      setError("Missing API base URL")
      return
    }
    if (!token) {
      setError("Missing invite token")
      return
    }
    if (form.password !== form.password2) {
      setError("Passwords do not match.")
      return
    }

    try {
      setSubmitting(true)
      await apiSignupWithInvite(apiBaseUrl, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        invite_token: token,
      })
      setSuccess("Account created. You can now sign in.")
      router.replace("/login")
    } catch (e) {
      const err = e as ApiError
      void err
      setError(getErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>Create your account using an invite link.</CardDescription>
        </CardHeader>
        <CardContent>
          {inviteLoading ? (
            <div className="text-sm text-muted-foreground">Validating invite…</div>
          ) : inviteError ? (
            <div className="space-y-3">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{inviteError}</div>
              <div className="text-xs text-muted-foreground">
                Go to <Link className="text-foreground underline underline-offset-4" href="/login">sign in</Link>.
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              {inviteExpiresAt && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Invite expires: <span className="font-medium text-foreground">{new Date(inviteExpiresAt).toLocaleString()}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="first_name">
                    First name
                  </label>
                  <Input id="first_name" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="last_name">
                    Last name
                  </label>
                  <Input id="last_name" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  disabled={Boolean(inviteEmail)}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password2">
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password2}
                    onChange={(e) => setForm((p) => ({ ...p, password2: e.target.value }))}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {success && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

              <Button className="w-full" type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Creating account..." : "Create account"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link className="text-foreground underline underline-offset-4" href="/login">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
