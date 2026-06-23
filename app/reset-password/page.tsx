import type { Metadata } from "next"
import { Suspense } from "react"

import { ResetPasswordPage } from "@/components/pages/reset-password/ResetPasswordPage"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your account password.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  )
}

