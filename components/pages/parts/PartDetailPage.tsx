"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/metrics"
import { apiListPurchases, apiListSalesItems, apiSearchStock, getApiBaseUrl, type ApiPurchaseListItem, type ApiSalesItem, type ApiStock } from "@/lib/api"
import { getErrorMessage } from "@/lib/rbacUtils"

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function PartDetailPage({ partNumber }: { partNumber: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [stockRows, setStockRows] = useState<ApiStock[]>([])
  const [purchases, setPurchases] = useState<ApiPurchaseListItem[]>([])
  const [sales, setSales] = useState<ApiSalesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
  }, [pathname, router, sessionStatus, token])

  const canCallApi = Boolean(apiBaseUrl && token)

  useEffect(() => {
    const tokenStr = token
    if (!canCallApi || !tokenStr) return
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const [stockSearch, purchaseList, salesList] = await Promise.all([
          apiSearchStock(apiBaseUrl, tokenStr, partNumber),
          apiListPurchases(apiBaseUrl, tokenStr, { search: partNumber }),
          apiListSalesItems(apiBaseUrl, tokenStr, { partNumber }),
        ])

        if (cancelled) return

        const matchingStock = stockSearch.filter((s) => s.part_number === partNumber)
        setStockRows(matchingStock)
        setPurchases(purchaseList.filter((p) => p.part_number === partNumber))
        setSales(salesList.filter((s) => s.part_number === partNumber))
      } catch (e) {
        if (cancelled) return
        setStockRows([])
        setPurchases([])
        setSales([])
        setError(getErrorMessage(e, "Failed to load part details"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, canCallApi, partNumber, token])

  const partName = stockRows[0]?.part_name ?? "Part"
  const totalBalance = useMemo(() => stockRows.reduce((sum, s) => sum + (s.display_balance ?? 0), 0), [stockRows])
  const locationCount = stockRows.length

  const purchaseRows = useMemo(() => {
    return purchases
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [purchases])

  const saleRows = useMemo(() => {
    return sales
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [sales])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4" />
                Back to Inventory
              </Link>
            </Button>
          </div>
          <h1 className="text-xl font-semibold text-foreground">{partName}</h1>
          <p className="text-sm text-muted-foreground">{partNumber}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Total Balance {totalBalance}</Badge>
            <Badge variant="outline">Locations {locationCount}</Badge>
          </div>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Purchase</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">#{p.id}</TableCell>
                    <TableCell className="text-sm">{p.location_details?.location ?? p.location}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(parseMoney(p.total_amount))}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "approved" || p.status === "confirmed" ? "success" : p.status === "failed" ? "danger" : "warning"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.created_by_name}</TableCell>
                  </TableRow>
                ))}
                {purchaseRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No purchases found for this part.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{new Date(s.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">#{s.id}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.unit_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.total_price)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "approved" ? "success" : s.status === "rejected" ? "danger" : "warning"}>{s.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {saleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No sales found for this part.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

