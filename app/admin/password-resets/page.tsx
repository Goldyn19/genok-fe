import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPasswordResetsPage } from "@/components/pages/admin/password-resets/AdminPasswordResetsPage"

export const metadata: Metadata = {
  title: "Password Reset",
  description: "Create password reset links.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AdminPasswordResetsPage />
    </Suspense>
  )
}

