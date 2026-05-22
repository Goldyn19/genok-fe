export type Location = {
  id: string
  location: string
  parent?: string | null
}

export type Stock = {
  id: string
  part_name: string
  part_number: string
  location: string
  balance: number
  parent?: string | null
  price?: number | null
  is_caterpillar?: boolean
  brand?: string | null
  is_original?: boolean
}

export type ActivityItem = {
  id: string
  at: string
  entity: "stock" | "location"
  action: string
  referenceLabel: string
  referenceHref: string
}

export type AlertItem = {
  id: string
  severity: "info" | "warn" | "destructive"
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
}

