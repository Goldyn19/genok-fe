"use client"

import type { FormEvent } from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type FormState = {
  email: string
  password: string
}

function isProbablyEmail(value: string) {
  return /.+@.+\..+/.test(value)
}

function getErrorMessage(err: unknown) {
  if (typeof err === "object" && err != null && "message" in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
    return String(message)
  }

  return "Login failed"
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/dashboard"

  const [form, setForm] = useState<FormState>({ email: "", password: "" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return form.email.trim().length > 0 && form.password.length > 0
  }, [form.email, form.password])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const email = form.email.trim()
    if (!isProbablyEmail(email)) {
      setError("Enter a valid email address.")
      return
    }

    try {
      setSubmitting(true)
      const res = await signIn("credentials", {
        email,
        password: form.password,
        redirect: false,
        callbackUrl: nextPath,
      })

      if (!res || res.error) {
        setError("Invalid email or password")
        return
      }

      router.replace(res.url ?? nextPath)
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
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your Genok account to access the admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <Button className="w-full" type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              Back to <Link className="text-foreground underline underline-offset-4" href="/dashboard">dashboard</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
