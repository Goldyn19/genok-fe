import type { Metadata } from "next"
import { Suspense } from "react"

import { CartDetailsPage } from "@/components/pages/carts/CartDetailsPage"

export const metadata: Metadata = {
  title: "Cart Details",
  description: "Edit items, unit prices, and checkout.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CartDetailsPage />
    </Suspense>
  )
}

