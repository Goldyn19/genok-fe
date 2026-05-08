import type { Metadata } from "next"
import { Suspense } from "react"

import { NotificationsPage } from "@/components/pages/notifications/NotificationsPage"

export const metadata: Metadata = {
  title: "Notifications",
  description: "Approve or reject purchase requests and track your own requests.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <NotificationsPage />
    </Suspense>
  )
}
