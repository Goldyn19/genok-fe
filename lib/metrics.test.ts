import { describe, expect, it } from "vitest"

import { computeDashboardKpis } from "./metrics"

describe("computeDashboardKpis", () => {
  it("computes KPI totals", () => {
    const stock = [
      { id: "s1", part_name: "A", part_number: "P1", location: "l1", balance: 2, price: 1 },
      { id: "s2", part_name: "B", part_number: "P2", location: "l2", balance: 0, price: null },
      { id: "s3", part_name: "A", part_number: "P1", location: "l2", balance: 5, price: 2 },
    ]
    const locations = [
      { id: "l1", location: "L1", parent: null },
      { id: "l2", location: "L2", parent: null },
    ]
    const kpis = computeDashboardKpis(stock, locations, 3)
    expect(kpis.totalParts).toBe(2)
    expect(kpis.totalStockUnits).toBe(7)
    expect(kpis.lowStockCount).toBe(1)
    expect(kpis.locationsCount).toBe(2)
  })
})

