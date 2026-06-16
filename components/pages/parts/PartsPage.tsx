"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

import { apiListActivityPage, getApiBaseUrl, type ApiActivityItem } from "@/lib/api"
import { getErrorMessage } from "@/lib/rbacUtils"
import { formatCurrency } from "@/lib/metrics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const PAGE_SIZE = 10

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
  const initialPage = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)

  const [q, setQ] = useState(initialQ)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [page, setPage] = useState(initialPage)

  const [activityRows, setActivityRows] = useState<ApiActivityItem[]>([])
  const [activityCount, setActivityCount] = useState(0)
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

        const data = await apiListActivityPage(apiBaseUrl, token as string, {
          page,
          page_size: PAGE_SIZE,
          q: q.trim() || undefined,
          fromDate: from.trim() || undefined,
          toDate: to.trim() || undefined,
        })

        setActivityRows(data.results)
        setActivityCount(data.count)
      } catch (e) {
        setActivityRows([])
        setActivityCount(0)
        setError(getErrorMessage(e, "Failed to load purchases and sales"))
      } finally {
        setLoading(false)
      }
    }
  }, [apiBaseUrl, canCallApi, from, page, q, to, token])

  useEffect(() => {
    void reload()
  }, [reload])

  const totalPages = Math.max(1, Math.ceil(activityCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const buildActivityQuery = (next: { q?: string; from?: string; to?: string; page?: number }) => {
    const qs = new URLSearchParams()
    if (next.q?.trim()) qs.set("q", next.q)
    if (next.from?.trim()) qs.set("from", next.from)
    if (next.to?.trim()) qs.set("to", next.to)
    if ((next.page ?? 1) > 1) qs.set("page", String(next.page))
    const suffix = qs.toString() ? `?${qs.toString()}` : ""
    router.replace(`/activity${suffix}`)
  }

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
                setPage(1)
                buildActivityQuery({ q: next, from, to, page: 1 })
              }}
              placeholder="Search by part name or number"
            />
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                const next = e.target.value
                setFrom(next)
                setPage(1)
                buildActivityQuery({ q, from: next, to, page: 1 })
              }}
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                const next = e.target.value
                setTo(next)
                setPage(1)
                buildActivityQuery({ q, from, to: next, page: 1 })
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
                activityRows.map((r) => (
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
              {!loading && activityRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No purchases or sales found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!loading && activityCount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{activityRows.length}</span> of{" "}
                <span className="font-medium text-foreground">{activityCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    const nextPage = Math.max(1, currentPage - 1)
                    setPage(nextPage)
                    buildActivityQuery({ q, from, to, page: nextPage })
                  }}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
                <div className="text-xs text-muted-foreground tabular-nums">
                  Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages}</span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    const nextPage = Math.min(totalPages, currentPage + 1)
                    setPage(nextPage)
                    buildActivityQuery({ q, from, to, page: nextPage })
                  }}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

