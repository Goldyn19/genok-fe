"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

import { apiListPurchases, apiListSalesItems, getApiBaseUrl, type ApiPurchaseListItem, type ApiSalesItem } from "@/lib/api"
import { getErrorMessage } from "@/lib/rbacUtils"
import { formatCurrency } from "@/lib/metrics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type ActivityRow =
  | {
      kind: "purchase"
      created_at: string
      id: number
      part_name: string
      part_number: string
      quantity: number
      status: string
      location: string
      total: number | null
      created_by_name: string
    }
  | {
      kind: "sale"
      created_at: string
      id: string
      part_name: string
      part_number: string
      quantity: number
      status: string
      location: string
      total: number | null
      created_by_name: string
    }

function statusBadgeVariant(status: string) {
  const s = status.toLowerCase()
  if (s === "approved" || s === "confirmed") return "success"
  if (s === "rejected" || s === "failed") return "danger"
  return "warning"
}

export function PartsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const initialQ = searchParams.get("q") ?? ""
  const initialFrom = searchParams.get("from") ?? ""
  const initialTo = searchParams.get("to") ?? ""

  const [q, setQ] = useState(initialQ)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)

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

  const reload = useMemo(() => {
    return async function reloadActivity() {
      if (!canCallApi) return
      try {
        setLoading(true)
        setError(null)

        const [p, s] = await Promise.all([
          apiListPurchases(apiBaseUrl, token as string, {
            fromDate: from.trim() || undefined,
            toDate: to.trim() || undefined,
            search: q.trim() || undefined,
          }),
          apiListSalesItems(apiBaseUrl, token as string),
        ])

        setPurchases(p)
        setSales(s)
      } catch (e) {
        setPurchases([])
        setSales([])
        setError(getErrorMessage(e, "Failed to load purchases and sales"))
      } finally {
        setLoading(false)
      }
    }
  }, [apiBaseUrl, canCallApi, from, q, to, token])

  useEffect(() => {
    void reload()
  }, [reload])

  const combined = useMemo(() => {
    const qLower = q.trim().toLowerCase()
    const fromDate = from.trim()
    const toDate = to.trim()

    const matches = (partName: string, partNumber: string) => {
      if (!qLower) return true
      return [partName, partNumber].some((v) => v.toLowerCase().includes(qLower))
    }

    const inRange = (createdAt: string) => {
      const d = createdAt.slice(0, 10)
      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      return true
    }

    const purchaseRows: ActivityRow[] = purchases
      .filter((p) => matches(p.name, p.part_number) && inRange(p.created_at))
      .map((p) => ({
        kind: "purchase",
        created_at: p.created_at,
        id: p.id,
        part_name: p.name,
        part_number: p.part_number,
        quantity: p.quantity,
        status: p.status,
        location: p.location_details?.location ?? p.location,
        total: p.total_amount ? Number(p.total_amount) : null,
        created_by_name: p.created_by_name,
      }))

    const salesRows: ActivityRow[] = sales
      .filter((s) => matches(s.part_name, s.part_number) && inRange(s.created_at))
      .map((s) => ({
        kind: "sale",
        created_at: s.created_at,
        id: s.id,
        part_name: s.part_name,
        part_number: s.part_number,
        quantity: s.quantity,
        status: s.status,
        location: "—",
        total: typeof s.total_price === "number" ? s.total_price : null,
        created_by_name: "—",
      }))

    return [...purchaseRows, ...salesRows].sort((a, b) => {
      const ta = Date.parse(a.created_at)
      const tb = Date.parse(b.created_at)
      if (!Number.isFinite(ta) || !Number.isFinite(tb)) return String(b.created_at).localeCompare(String(a.created_at))
      return tb - ta
    })
  }, [from, purchases, q, sales, to])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Purchases &amp; Sales</h1>
        <p className="text-sm text-muted-foreground">View all purchases and sales, arranged by date.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-2 md:grid-cols-3">
            <Input
              value={q}
              onChange={(e) => {
                const next = e.target.value
                setQ(next)
                const qs = new URLSearchParams()
                if (next.trim()) qs.set("q", next)
                if (from.trim()) qs.set("from", from)
                if (to.trim()) qs.set("to", to)
                const suffix = qs.toString() ? `?${qs.toString()}` : ""
                router.replace(`/activity${suffix}`)
              }}
              placeholder="Search by part name or number"
            />
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                const next = e.target.value
                setFrom(next)
                const qs = new URLSearchParams()
                if (q.trim()) qs.set("q", q)
                if (next.trim()) qs.set("from", next)
                if (to.trim()) qs.set("to", to)
                const suffix = qs.toString() ? `?${qs.toString()}` : ""
                router.replace(`/activity${suffix}`)
              }}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                const next = e.target.value
                setTo(next)
                const qs = new URLSearchParams()
                if (q.trim()) qs.set("q", q)
                if (from.trim()) qs.set("from", from)
                if (next.trim()) qs.set("to", next)
                const suffix = qs.toString() ? `?${qs.toString()}` : ""
                router.replace(`/activity${suffix}`)
              }}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                combined.map((r) => (
                  <TableRow key={`${r.kind}-${String(r.id)}`}>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{r.kind === "purchase" ? "Purchase" : "Sale"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{String(r.id)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium text-foreground">{r.part_name}</div>
                      <div className="text-muted-foreground">{r.part_number}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.location}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && combined.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No purchases or sales found.
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

