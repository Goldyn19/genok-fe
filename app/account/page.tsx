import type { Metadata } from "next"

import { MyAccountPage } from "@/components/pages/myAccount/MyAccountPage"

export const metadata: Metadata = {
  title: "My Account",
  description: "View your assigned roles and effective permissions.",
}

export default function Page() {
  return <MyAccountPage />
}
