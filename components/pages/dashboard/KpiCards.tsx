"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/components/pages/dashboard/format"

export type DashboardTotals = {
  totalParts: number
  lowStock: number
  outOfStock: number
  ordersToday: number
  monthlyRevenue: number
}

export function KpiCards({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-emerald-600">
        <CardHeader className="pb-2">
          <CardDescription>Total Parts in Inventory</CardDescription>
          <CardTitle className="text-[clamp(1.5rem,3vw,2rem)] tabular-nums">{totals.totalParts.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">Healthy catalog coverage</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-red-600">
        <CardHeader className="pb-2">
          <CardDescription>Low Stock Items</CardDescription>
          <CardTitle className="text-[clamp(1.5rem,3vw,2rem)] tabular-nums">{totals.lowStock.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">{totals.outOfStock} out of stock</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-amber-600">
        <CardHeader className="pb-2">
          <CardDescription>Orders Today</CardDescription>
          <CardTitle className="text-[clamp(1.5rem,3vw,2rem)] tabular-nums">{totals.ordersToday.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">Pending workload highlighted</div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader className="pb-2">
          <CardDescription>Monthly Revenue</CardDescription>
          <CardTitle className="text-[clamp(1.5rem,3vw,2rem)] tabular-nums">{formatMoney(totals.monthlyRevenue)}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xs text-muted-foreground">Month-to-date</div>
        </CardContent>
      </Card>
    </div>
  )
}
