"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Location, Stock } from "@/lib/types"
import { LOCATIONS, STOCK as INITIAL_STOCK } from "@/lib/mock-data"

type PartRow = {
  part_name: string
  part_number: string
  total_balance: number
  locations_count: number
}

function aggregateParts(stock: Stock[], locations: Location[]): PartRow[] {
  const locationById = new Map(locations.map((l) => [l.id, l.location]))
  const byPart = new Map<string, { part_name: string; part_number: string; total_balance: number; locs: Set<string> }>()

  for (const s of stock) {
    const existing = byPart.get(s.part_number)
    if (existing) {
      existing.total_balance += s.balance
      existing.locs.add(locationById.get(s.location) ?? "Unknown")
    } else {
      byPart.set(s.part_number, {
        part_name: s.part_name,
        part_number: s.part_number,
        total_balance: s.balance,
        locs: new Set([locationById.get(s.location) ?? "Unknown"]),
      })
    }
  }

  return Array.from(byPart.values())
    .map((v) => ({
      part_name: v.part_name,
      part_number: v.part_number,
      total_balance: v.total_balance,
      locations_count: v.locs.size,
    }))
    .sort((a, b) => a.part_number.localeCompare(b.part_number))
}

export function PartsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""

  const [q, setQ] = useState(initialQ)

  const rows = useMemo(() => aggregateParts(INITIAL_STOCK, LOCATIONS), [])
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => [r.part_name, r.part_number].some((v) => v.toLowerCase().includes(term)))
  }, [q, rows])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Parts</h1>
        <p className="text-sm text-muted-foreground">Browse parts and drill into per-part stock distribution.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parts List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={q}
            onChange={(e) => {
              const next = e.target.value
              setQ(next)
              router.replace(`/parts?q=${encodeURIComponent(next)}`)
            }}
            placeholder="Search by name or part number"
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Name</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead className="text-right">Total Balance</TableHead>
                <TableHead className="text-right">Locations Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.part_number}
                  className="cursor-pointer"
                  onClick={() => router.push(`/parts/${encodeURIComponent(r.part_number)}`)}
                >
                  <TableCell className="font-medium">{r.part_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.part_number}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_balance}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{r.locations_count}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    No parts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

