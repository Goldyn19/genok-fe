import type { Metadata } from "next"
import { Suspense } from "react"

import { PartsPage } from "@/components/pages/parts/PartsPage"

export const metadata: Metadata = {
  title: "Parts",
  description: "Browse parts and drill into per-part stock distribution.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <PartsPage />
    </Suspense>
  )
}
