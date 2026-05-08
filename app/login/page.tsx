import type { Metadata } from "next"
import { Suspense } from "react"

import { LoginPage } from "@/components/pages/login/LoginPage"

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to access the Genok admin dashboard.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-md items-center px-4 text-sm text-muted-foreground">Loading…</div>}>
      <LoginPage />
    </Suspense>
  )
}
