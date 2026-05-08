export type DashboardRecentOrder = {
  id: string
  customer: string
  items: number
  total: number
  status: "Pending" | "Completed" | "Cancelled"
  date: string
}

export const DASHBOARD_RECENT_ORDERS: DashboardRecentOrder[] = [
  { id: "SO-10231", customer: "Stonebridge Works", items: 5, total: 1280, status: "Pending", date: "2026-03-23" },
  { id: "SO-10230", customer: "Northfield Mining", items: 2, total: 340, status: "Completed", date: "2026-03-23" },
  { id: "SO-10229", customer: "Apex Fabrication", items: 9, total: 2210, status: "Pending", date: "2026-03-22" },
  { id: "SO-10228", customer: "Cobalt Systems", items: 1, total: 85, status: "Cancelled", date: "2026-03-22" },
]

export const DASHBOARD_INVENTORY_MOVEMENT_30D = Array.from({ length: 30 }).map((_, i) => {
  const day = i + 1
  const inbound = 20 + ((i * 7) % 18)
  const outbound = 15 + ((i * 5) % 16)
  return {
    day: day.toString().padStart(2, "0"),
    inbound,
    outbound,
  }
})

export const DASHBOARD_SALES_BY_CATEGORY = [
  { category: "Hydraulics", value: 18400 },
  { category: "Electrical", value: 12300 },
  { category: "Filters", value: 9800 },
  { category: "Bearings", value: 7600 },
  { category: "Powertrain", value: 14100 },
]

export const DASHBOARD_TOP_SELLING_PARTS = [
  { partNumber: "PN-44090", name: "Oil Filter (Heavy Duty)", units: 420 },
  { partNumber: "PN-33007", name: "Bearing 6205-ZZ", units: 360 },
  { partNumber: "PN-22014", name: "Drive Belt 8PK", units: 240 },
  { partNumber: "PN-55110", name: "Control Relay 24V", units: 190 },
]
