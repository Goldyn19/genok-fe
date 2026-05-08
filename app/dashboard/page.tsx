import type { Metadata } from "next"

import { DashboardPage } from "@/components/pages/dashboard/DashboardPage"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of inventory health, KPIs, and alerts.",
}

export default function Page() {
  return <DashboardPage />
}
