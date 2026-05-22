import type { Metadata } from "next"
import { Suspense } from "react"

import { CreditsPage } from "@/components/pages/credits/CreditsPage"

export const metadata: Metadata = {
  title: "Customer Credit",
  description: "View and manage customer credit records.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CreditsPage />
    </Suspense>
  )
}

