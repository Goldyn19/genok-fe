import type { Location, Stock } from "@/lib/types"

export type DashboardKpis = {
  totalParts: number
  totalStockUnits: number
  lowStockCount: number
  locationsCount: number
}

export function computeDashboardKpis(stock: Stock[], locations: Location[], lowStockThreshold: number): DashboardKpis {
  const totalParts = new Set(stock.map((s) => s.part_number)).size
  const totalStockUnits = stock.reduce((sum, s) => sum + s.balance, 0)
  const lowStockCount = stock.filter((s) => s.balance > 0 && s.balance <= lowStockThreshold).length
  const locationsCount = locations.length
  return { totalParts, totalStockUnits, lowStockCount, locationsCount }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—"
  const normalized = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(normalized)
}

