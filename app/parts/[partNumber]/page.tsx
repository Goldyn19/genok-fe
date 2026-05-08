import type { Metadata } from "next"

import { PartDetailPage } from "@/components/pages/parts/PartDetailPage"

export const metadata: Metadata = {
  title: "Part Detail",
  description: "Part metadata and stock distribution by location.",
}

export default function Page({ params }: { params: { partNumber: string } }) {
  return <PartDetailPage partNumber={decodeURIComponent(params.partNumber)} />
}
