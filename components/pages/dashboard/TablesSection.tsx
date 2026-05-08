"use client"

import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { LOCATIONS, STOCK } from "@/lib/mock-data"
import { DASHBOARD_RECENT_ORDERS, type DashboardRecentOrder } from "@/lib/dashboard-mock"
import { formatMoney } from "@/components/pages/dashboard/format"

const LOW_STOCK_THRESHOLD = 10

function resolveLocationName(locationId: string) {
  return LOCATIONS.find((l) => l.id === locationId)?.location ?? locationId
}

export function TablesSection({
  onOrderClick,
  onLowStockClick,
}: {
  onOrderClick: (order: DashboardRecentOrder) => void
  onLowStockClick: (partNumber: string) => void
}) {
  const lowStockRows = useMemo(
    () =>
      STOCK.filter((r) => r.balance <= LOW_STOCK_THRESHOLD)
        .slice(0, 6)
        .map((r) => ({
          id: r.id,
          partNumber: r.part_number,
          location: resolveLocationName(r.location),
          balance: r.balance,
        })),
    []
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Click a row to open order details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DASHBOARD_RECENT_ORDERS.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer [&>td]:px-3 [&>td]:py-3 md:[&>td]:px-4 md:[&>td]:py-4"
                  onClick={() => onOrderClick(o)}
                >
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell className="hidden md:table-cell">{o.customer}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "Completed" ? "success" : o.status === "Pending" ? "warning" : "outline"}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{o.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alert</CardTitle>
          <CardDescription>Reorder signals by location.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockRows.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer [&>td]:px-3 [&>td]:py-3 md:[&>td]:px-4 md:[&>td]:py-4"
                  onClick={() => onLowStockClick(r.partNumber)}
                >
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">{r.partNumber}</div>
                    <div className="text-xs text-muted-foreground">{r.location}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={cn(r.balance === 0 ? "text-muted-foreground" : "text-red-600")}>{r.balance}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
