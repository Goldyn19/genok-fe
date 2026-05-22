import type { Metadata } from "next"
import { Suspense } from "react"

import { PartsPage } from "@/components/pages/parts/PartsPage"

export const metadata: Metadata = {
  title: "Purchases & Sales",
  description: "View purchases and sales arranged by date.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <PartsPage />
    </Suspense>
  )
}

