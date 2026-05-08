"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartsSection } from "@/components/pages/dashboard/ChartsSection"
import { DetailsSheet, type DashboardSheetState } from "@/components/pages/dashboard/DetailsSheet"
import { KpiCards, type DashboardTotals } from "@/components/pages/dashboard/KpiCards"
import { TablesSection } from "@/components/pages/dashboard/TablesSection"
import { DASHBOARD_RECENT_ORDERS } from "@/lib/dashboard-mock"
import { ALERTS, RECENT_ACTIVITY, STOCK } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/metrics"

const LOW_STOCK_THRESHOLD = 10

export function DashboardPage() {
  const [open, setOpen] = useState(false)
  const [sheetState, setSheetState] = useState<DashboardSheetState>(null)

  const totals = useMemo<DashboardTotals>(() => {
    const totalParts = new Set(STOCK.map((r) => r.part_number)).size
    const lowStock = STOCK.filter((r) => r.balance > 0 && r.balance <= LOW_STOCK_THRESHOLD).length
    const outOfStock = STOCK.filter((r) => r.balance === 0).length
    const today = "2026-03-23"
    const ordersToday = DASHBOARD_RECENT_ORDERS.filter((o) => o.date === today).length
    const monthlyRevenue = 84230
    return { totalParts, lowStock, outOfStock, ordersToday, monthlyRevenue }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Operational Dashboard</h1>
          <p className="text-sm text-muted-foreground">Inventory health, order activity, and revenue signals.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href="/inventory">Open Inventory</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/parts">Browse Parts</Link>
          </Button>
        </div>
      </div>

      <KpiCards totals={totals} />

      <div className="space-y-4">
        <ChartsSection />
        <TablesSection
          onOrderClick={(order) => {
            setSheetState({ type: "order", order })
            setOpen(true)
          }}
          onLowStockClick={(partNumber) => {
            setSheetState({ type: "lowStock", partNumber })
            setOpen(true)
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALERTS.map((a) => (
              <Alert key={a.id} variant={a.severity}>
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                  <div>
                    <AlertTitle>{a.title}</AlertTitle>
                    <AlertDescription>{a.description}</AlertDescription>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href={a.ctaHref}>{a.ctaLabel}</Link>
                  </Button>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead className="hidden md:table-cell">Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RECENT_ACTIVITY.map((r) => (
                  <TableRow key={r.id} className="[&>td]:px-3 [&>td]:py-3 md:[&>td]:px-4 md:[&>td]:py-4">
                    <TableCell className="text-muted-foreground tabular-nums">{r.at}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={r.entity === "stock" ? "secondary" : "outline"}>{r.entity}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.action}</TableCell>
                    <TableCell className="text-right">
                      <Link href={r.referenceHref} className="text-sm font-medium text-foreground hover:underline">
                        {r.referenceLabel}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {RECENT_ACTIVITY.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No recent activity.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-3 text-xs text-muted-foreground">Prices displayed as {formatCurrency(0)} samples.</div>
          </CardContent>
        </Card>
      </div>

      <DetailsSheet
        open={open}
        state={sheetState}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setSheetState(null)
        }}
      />
    </div>
  )
}

