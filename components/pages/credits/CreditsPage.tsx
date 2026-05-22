"use client"
"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, Plus, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiCreateCreditCustomer, apiListCreditCustomers, getApiBaseUrl, type ApiCreditCustomer } from "@/lib/api"
import { getErrorMessage } from "@/lib/rbacUtils"

export function CreditsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [customers, setCustomers] = useState<ApiCreditCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

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
        setLoadError(null)
        const data = await apiListCreditCustomers(apiBaseUrl, tokenStr)
        if (cancelled) return
        setCustomers(data)
      } catch (e) {
        if (cancelled) return
        setCustomers([])
        setLoadError(getErrorMessage(e, "Failed to load customer credit records"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, canCallApi, token])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((c) => String(c.customer_name ?? "").toLowerCase().includes(query))
  }, [customers, q])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Customer Credit</h1>
          <p className="text-sm text-muted-foreground">Track customer credit (sales on credit) and payments.</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New customer
        </Button>
      </div>

      {loadError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Customers</CardTitle>
            <div className="w-full sm:w-[320px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer…" />
            </div>
          </div>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-[220px]">Credit ID</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.credit_id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/credits/${encodeURIComponent(c.credit_id)}`)}
                    >
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{c.customer_name}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.credit_id}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/credits/${encodeURIComponent(c.credit_id)}`)
                          }}
                        >
                          <Receipt className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setCreateName("")
            setCreateError(null)
            setCreating(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New credit customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Customer name</div>
            <Input
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value)
                setCreateError(null)
              }}
              placeholder="e.g. Acme Logistics"
            />
            {createError && <div className="text-sm text-red-600">{createError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              disabled={!canCallApi || creating}
              onClick={async () => {
                const tokenStr = token
                if (!tokenStr) return
                const name = createName.trim()
                if (!name) {
                  setCreateError("Customer name is required")
                  return
                }

                try {
                  setCreating(true)
                  setCreateError(null)
                  const created = await apiCreateCreditCustomer(apiBaseUrl, tokenStr, { customer_name: name })
                  setCustomers((prev) => {
                    const next = [created, ...prev].slice()
                    next.sort((a, b) => String(a.customer_name).localeCompare(String(b.customer_name)))
                    return next
                  })
                  setCreateOpen(false)
                  router.push(`/credits/${encodeURIComponent(created.credit_id)}`)
                } catch (e) {
                  setCreateError(getErrorMessage(e, "Failed to create customer"))
                } finally {
                  setCreating(false)
                }
              }}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

