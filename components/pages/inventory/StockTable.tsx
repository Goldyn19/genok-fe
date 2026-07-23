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

function locationLookup(locations: Location[]) {
  return new Map(locations.map((location) => [location.id, location]))
}

function locationPath(locations: Location[], id: string) {
  const lookup = locationLookup(locations)
  const parts: string[] = []
  const seen = new Set<string>()
  let current = lookup.get(id)

  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    parts.unshift(current.location)
    current = current.parent ? lookup.get(current.parent) : undefined
  }

  return parts.join(" / ")
}

function locationNames(locations: Location[], ids: string[]) {
  const lookup = locationLookup(locations)
  return ids.map((id) => lookup.get(id)?.location ?? id).join(", ")
}

function locationPaths(locations: Location[], ids: string[]) {
  return ids.map((id) => locationPath(locations, id) || id).join(", ")
}

function statusBadge(balance: number, lowStockThreshold: number) {
  void lowStockThreshold
  if (balance === 0) return { label: "Low", variant: "danger" as const }
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
              <TableCell className="font-medium">
                <div className="text-sm font-medium text-foreground">{r.part_name}</div>
                {(r.brand?.trim() || r.is_caterpillar != null || r.is_original != null) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {r.brand?.trim() && <span className="text-xs text-muted-foreground">{r.brand}</span>}
                    {(r.is_caterpillar ?? true) && <Badge variant="outline">CAT</Badge>}
                    {!(r.is_caterpillar ?? true) && <Badge variant="outline">Non-CAT</Badge>}
                    {(r.is_original ?? true) && <Badge variant="outline">Original</Badge>}
                    {!(r.is_original ?? true) && <Badge variant="outline">Aftermarket</Badge>}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.part_number}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="md:hidden">{locationNames(locations, r.locations)}</div>
                <div className="hidden md:block">{locationPaths(locations, r.locations)}</div>
              </TableCell>
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

