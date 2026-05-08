"use client"

import { ArrowDown, ArrowUp } from "lucide-react"

import type { Location, Stock } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/metrics"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type SortKey = "part_name" | "part_number" | "location" | "balance" | "price"
type SortDir = "asc" | "desc"

function locationLabel(locations: Location[], id: string) {
  return locations.find((l) => l.id === id)?.location ?? "Unknown"
}

function statusBadge(balance: number, lowStockThreshold: number) {
  if (balance === 0) return { label: "Out of stock", variant: "outline" as const }
  if (balance <= lowStockThreshold) return { label: "Low", variant: "danger" as const }
  return { label: "OK", variant: "success" as const }
}

export function StockTable({
  rows,
  locations,
  lowStockThreshold,
  sort,
  onSort,
  onRowClick,
}: {
  rows: Stock[]
  locations: Location[]
  lowStockThreshold: number
  sort: { key: SortKey; dir: SortDir } | null
  onSort: (key: SortKey) => void
  onRowClick: (row: Stock) => void
}) {
  const sortIcon = (k: SortKey) => {
    if (!sort || sort.key !== k) return null
    return sort.dir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1" onClick={() => onSort("part_name")}>
              Part Name
              {sortIcon("part_name")}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1" onClick={() => onSort("part_number")}>
              Part Number
              {sortIcon("part_number")}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" size="sm" className="-ml-2 gap-1" onClick={() => onSort("location")}>
              Location
              {sortIcon("location")}
            </Button>
          </TableHead>
          <TableHead className="text-right">
            <Button variant="ghost" size="sm" className="-mr-2 gap-1" onClick={() => onSort("balance")}>
              Balance
              {sortIcon("balance")}
            </Button>
          </TableHead>
          <TableHead className="text-right">
            <Button variant="ghost" size="sm" className="-mr-2 gap-1" onClick={() => onSort("price")}>
              Price
              {sortIcon("price")}
            </Button>
          </TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const status = statusBadge(r.balance, lowStockThreshold)
          return (
            <TableRow key={r.id} className={cn("cursor-pointer")} onClick={() => onRowClick(r)}>
              <TableCell className="font-medium">{r.part_name}</TableCell>
              <TableCell className="text-muted-foreground">{r.part_number}</TableCell>
              <TableCell className="text-muted-foreground">{locationLabel(locations, r.location)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.balance}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(r.price)}</TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
            </TableRow>
          )
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
              No stock found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

