import type { Metadata } from "next"
import { Suspense } from "react"

import { GroupsPermissionsPage } from "@/components/pages/admin/groups/GroupsPermissionsPage"

export const metadata: Metadata = {
  title: "Groups & Permissions",
  description: "Manage groups, memberships, and permissions.",
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <GroupsPermissionsPage />
    </Suspense>
  )
}

