"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DASHBOARD_INVENTORY_MOVEMENT_30D,
  DASHBOARD_SALES_BY_CATEGORY,
  DASHBOARD_TOP_SELLING_PARTS,
} from "@/lib/dashboard-mock"
import { formatMoney } from "@/components/pages/dashboard/format"

export function ChartsSection() {
  const maxTopUnits = Math.max(...DASHBOARD_TOP_SELLING_PARTS.map((p) => p.units))

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Inventory Movement (Last 30 Days)</CardTitle>
            <CardDescription>Inbound vs outbound units per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] md:h-[280px] lg:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DASHBOARD_INVENTORY_MOVEMENT_30D} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="inbound" stroke="#2563EB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="outbound" stroke="#0F766E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Top Selling Parts</CardTitle>
            <CardDescription>Units shipped in last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DASHBOARD_TOP_SELLING_PARTS.map((p) => {
              const width = Math.round((p.units / maxTopUnits) * 100)
              return (
                <div key={p.partNumber} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.partNumber}</div>
                    </div>
                    <div className="text-sm tabular-nums">{p.units}</div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>Monthly revenue distribution.</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px] md:h-[280px] lg:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DASHBOARD_SALES_BY_CATEGORY} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip formatter={(v: number) => formatMoney(v)} />
              <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}
