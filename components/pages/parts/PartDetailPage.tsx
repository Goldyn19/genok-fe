"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/metrics"
import { LOCATIONS, STOCK } from "@/lib/mock-data"

const LOW_STOCK_THRESHOLD = 10

function locationLabel(id: string) {
  return LOCATIONS.find((l) => l.id === id)?.location ?? "Unknown"
}

export function PartDetailPage({ partNumber }: { partNumber: string }) {
  const stocks = useMemo(() => STOCK.filter((s) => s.part_number === partNumber), [partNumber])
  const partName = stocks[0]?.part_name ?? "Part"

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
              <Link href="/parts">
                <ArrowLeft className="h-4 w-4" />
                Back to Parts
              </Link>
            </Button>
          </div>
          <h1 className="text-xl font-semibold text-foreground">{partName}</h1>
          <p className="text-sm text-muted-foreground">{partNumber}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock By Location</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((s) => {
                const low = s.balance > 0 && s.balance <= LOW_STOCK_THRESHOLD
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{locationLabel(s.location)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.balance}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.price)}</TableCell>
                    <TableCell>
                      {s.balance === 0 ? (
                        <Badge variant="outline">Out of stock</Badge>
                      ) : low ? (
                        <Badge variant="warning">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {stocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    No stock found for this part.
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

