import type { Metadata } from "next"
import { Suspense } from "react"

import { CartsPage } from "@/components/pages/carts/CartsPage"

export const metadata: Metadata = {
  title: "Carts",
  description: "Create and manage customer carts.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <CartsPage />
    </Suspense>
  )
}

