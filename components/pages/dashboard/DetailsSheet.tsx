"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { DashboardRecentOrder } from "@/lib/dashboard-mock"
import { formatMoney } from "@/components/pages/dashboard/format"

export type DashboardSheetState =
  | { type: "order"; order: DashboardRecentOrder }
  | { type: "lowStock"; partNumber: string }
  | null

export function DetailsSheet({
  open,
  onOpenChange,
  state,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: DashboardSheetState
}) {
  const headerTitle = state?.type === "order" ? state.order.id : state?.type === "lowStock" ? "Low Stock Details" : "Details"
  const headerDescription =
    state?.type === "order"
      ? "Order summary and next actions."
      : state?.type === "lowStock"
        ? "Part balance and reorder information."
        : "Select a row to view details."

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0 max-w-none sm:max-w-md">
        <SheetHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4 pr-12">
          <SheetTitle>{headerTitle}</SheetTitle>
          <SheetDescription>{headerDescription}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!state && <div className="text-sm text-muted-foreground">Select a row to view details.</div>}

          {state?.type === "order" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Customer</div>
                <div className="text-sm font-medium text-foreground">{state.order.customer}</div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                  <div className="text-xs text-muted-foreground">Items</div>
                  <div className="text-lg font-semibold tabular-nums">{state.order.items}</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold tabular-nums">{formatMoney(state.order.total)}</div>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Payment status</div>
                <div className="mt-1">
                  <Badge variant={state.order.status === "Completed" ? "success" : "warning"}>
                    {state.order.status === "Completed" ? "Paid" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {state?.type === "lowStock" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Part Number</div>
                <div className="text-sm font-medium text-foreground">{state.partNumber}</div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>

            {state?.type === "order" && (
              <Button variant="outline" className="w-full sm:flex-1" asChild>
                <Link href="/inventory">Open Inventory</Link>
              </Button>
            )}

            {state?.type === "lowStock" && (
              <Button variant="outline" className="w-full sm:flex-1" asChild>
                <Link href={`/parts/${encodeURIComponent(state.partNumber)}`}>Open Part Details</Link>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
