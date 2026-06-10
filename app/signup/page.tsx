import type { Metadata } from "next"
import { Suspense } from "react"

import { SignupPage } from "@/components/pages/signup/SignupPage"

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create an account using an invite link.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <SignupPage />
    </Suspense>
  )
}
