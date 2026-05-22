import type { Metadata } from "next"

import { CreditDetailPage } from "@/components/pages/credits/CreditDetailPage"

export const metadata: Metadata = {
  title: "Credit Record",
  description: "Customer credit record details, transactions, and payments.",
}

export default async function Page({ params }: { params: Promise<{ creditId: string }> }) {
  const { creditId } = await params
  return <CreditDetailPage creditId={decodeURIComponent(creditId)} />
}
