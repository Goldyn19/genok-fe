import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Parts",
  description: "Parts route moved.",
}

export default function Page() {
  redirect("/activity")
}
