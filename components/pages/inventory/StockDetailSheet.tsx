"use client"

import Link from "next/link"

import type { Location, Stock } from "@/lib/types"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/metrics"

function locationLabel(locations: Location[], id: string) {
  return locations.find((l) => l.id === id)?.location ?? "Unknown"
}

export function StockDetailSheet({
  stock,
  locations,
  open,
  onOpenChange,
  onEdit,
  onRequestIncrease,
}: {
  stock: Stock | null
  locations: Location[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onRequestIncrease: () => void
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{stock?.part_number ?? "Stock"}</SheetTitle>
          <SheetDescription>{stock?.part_name ?? ""}</SheetDescription>
        </SheetHeader>
        {stock && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="text-sm font-medium text-foreground">{locationLabel(locations, stock.location)}</div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Balance</div>
                <div className="text-lg font-semibold tabular-nums">{stock.balance}</div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(stock.price)}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/parts/${encodeURIComponent(stock.part_number)}`}>View Part</Link>
              </Button>
              <Button variant="outline" className="flex-1" onClick={onRequestIncrease}>
                Add Stock
              </Button>
            </div>
            <Button className="w-full" onClick={onEdit}>
              Edit Details
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

