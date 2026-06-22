import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminFinalPurchaseApprovalsPage } from "@/components/pages/admin/final-approvals/AdminFinalPurchaseApprovalsPage"

export const metadata: Metadata = {
  title: "Final Purchase Approvals",
  description: "Superuser final-step purchase approvals.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AdminFinalPurchaseApprovalsPage />
    </Suspense>
  )
}
