import type { Metadata } from "next"

import { SignupPage } from "@/components/pages/signup/SignupPage"

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create an account using an invite link.",
}

export default function Page() {
  return <SignupPage />
}

