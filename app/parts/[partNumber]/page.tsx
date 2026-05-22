import type { Metadata } from "next"

import { PartDetailPage } from "@/components/pages/parts/PartDetailPage"

export const metadata: Metadata = {
  title: "Part Detail",
  description: "Part details, stock distribution, and purchase/sale history.",
}

export default async function Page({ params }: { params: Promise<{ partNumber: string }> }) {
  const { partNumber } = await params
  return <PartDetailPage partNumber={decodeURIComponent(partNumber)} />
}
