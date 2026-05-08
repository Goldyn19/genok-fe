"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ShoppingCart, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"

import { apiCreateCart, apiDeleteCart, apiListMyCarts, getApiBaseUrl, type ApiCart } from "@/lib/api"
import { formatMoney } from "@/lib/cartUtils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString()
}

function statusBadge(status: "open" | "checked_out") {
  if (status === "open") return <Badge variant="outline">Open</Badge>
  return <Badge variant="secondary">Checked out</Badge>
}

export function CartsPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [carts, setCarts] = useState<ApiCart[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === "loading") return
    const tokenStr = token
    if (!tokenStr) {
      router.replace(`/login?next=${encodeURIComponent("/carts")}`)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const data = await apiListMyCarts(apiBaseUrl, tokenStr)
        if (cancelled) return
        setCarts(data)
      } catch (e) {
        if (cancelled) return
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to load carts"
        setLoadError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, router, sessionStatus, token])

  const sorted = useMemo(() => {
    return carts.slice().sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
  }, [carts])

  const computeTotal = (c: ApiCart) =>
    c.items.reduce((sum, it) => sum + it.quantity * Number(it.unit_price ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Carts</h1>
          <p className="text-sm text-muted-foreground">Create multiple carts per customer, price items, then checkout.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Customer name</div>
              <Input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value)
                  setError(null)
                }}
                placeholder="e.g. Acme Logistics"
              />
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>

            <Button
              className="w-full gap-2"
              disabled={!token || !apiBaseUrl}
              onClick={async () => {
                const tokenStr = token
                if (!tokenStr) return
                const name = customerName.trim()
                if (!name) {
                  setError("Customer name is required")
                  return
                }
                try {
                  setError(null)
                  const cart = await apiCreateCart(apiBaseUrl, tokenStr, name)
                  setCustomerName("")
                  router.push(`/carts/${encodeURIComponent(cart.id)}`)
                } catch (e) {
                  const message =
                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                      ? ((e as { message?: unknown }).message as string)
                      : "Failed to create cart"
                  setError(message)
                }
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Create cart
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your carts</CardTitle>
          </CardHeader>
          <CardContent>
            {loadError && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead className="w-[140px]">Total</TableHead>
                    <TableHead className="w-[220px]">Updated</TableHead>
                    <TableHead className="w-[160px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No carts yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    sorted.map((c) => {
                    const total = computeTotal(c)
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/carts/${encodeURIComponent(c.id)}`)}>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{c.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{c.items.length} items</div>
                        </TableCell>
                        <TableCell>{statusBadge(c.is_checked_out ? "checked_out" : "open")}</TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">{formatMoney(total)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(c.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/carts/${encodeURIComponent(c.id)}`)
                            }}>
                              Open
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={c.is_checked_out}
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteId(c.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete cart</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">This will permanently delete the cart. This can’t be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!token || !apiBaseUrl}
              onClick={async () => {
                const tokenStr = token
                if (!tokenStr) return
                if (!deleteId) return
                try {
                  await apiDeleteCart(apiBaseUrl, tokenStr, deleteId)
                  setCarts((prev) => prev.filter((c) => c.id !== deleteId))
                  setDeleteId(null)
                } catch (e) {
                  const message =
                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                      ? ((e as { message?: unknown }).message as string)
                      : "Failed to delete cart"
                  setLoadError(message)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
