import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminInvitesPage } from "@/components/pages/admin/invites/AdminInvitesPage"

export const metadata: Metadata = {
  title: "Invites",
  description: "Create invite-only signup links.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <AdminInvitesPage />
    </Suspense>
  )
}

