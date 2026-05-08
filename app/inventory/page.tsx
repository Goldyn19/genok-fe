import type { Metadata } from "next"
import { Suspense } from "react"

import { InventoryPage } from "@/components/pages/inventory/InventoryPage"

export const metadata: Metadata = {
  title: "Inventory",
  description: "Browse and maintain stock and locations.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <InventoryPage />
    </Suspense>
  )
}
