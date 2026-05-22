"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiCreateCreditPayment, apiGetCreditCustomer, getApiBaseUrl, type ApiCreditCustomerDetail } from "@/lib/api"
import { formatCurrency } from "@/lib/metrics"
import { getErrorMessage } from "@/lib/rbacUtils"

export function CreditDetailPage({ creditId }: { creditId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [data, setData] = useState<ApiCreditCustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
  }, [pathname, router, sessionStatus, token])

  const canCallApi = Boolean(apiBaseUrl && token)

  const load = useCallback(async (tokenStr: string) => {
    const detail = await apiGetCreditCustomer(apiBaseUrl, tokenStr, creditId)
    setData(detail)
  }, [apiBaseUrl, creditId])

  useEffect(() => {
    const tokenStr = token
    if (!canCallApi || !tokenStr) return
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        await load(tokenStr)
      } catch (e) {
        if (cancelled) return
        setData(null)
        setError(getErrorMessage(e, "Failed to load credit record"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [canCallApi, load, token])

  const transactions = useMemo(() => {
    const rows = data?.transactions ?? []
    return rows.slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [data])

  const payments = useMemo(() => {
    const rows = data?.credit_payments ?? []
    return rows.slice().sort((a, b) => Date.parse(b.paid_at) - Date.parse(a.paid_at))
  }, [data])

  const title = data?.customer_name ?? "Credit Record"

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
              <Link href="/credits">
                <ArrowLeft className="h-4 w-4" />
                Back to Customer Credit
              </Link>
            </Button>
          </div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{creditId}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" disabled={!canCallApi || loading} onClick={async () => {
            const tokenStr = token
            if (!tokenStr) return
            try {
              setLoading(true)
              setError(null)
              await load(tokenStr)
            } catch (e) {
              setError(getErrorMessage(e, "Failed to refresh"))
            } finally {
              setLoading(false)
            }
          }}>
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => setPaymentOpen(true)}>
            <Plus className="h-4 w-4" />
            Record payment
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Credit</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold tabular-nums">{formatCurrency(data?.total_credit)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold tabular-nums">{formatCurrency(data?.total_paid)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold tabular-nums">{formatCurrency(data?.balance)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Credit Transactions</CardTitle>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Sale</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{new Date(t.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">#{t.sales}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        No credit transactions yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payments</CardTitle>
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{new Date(p.paid_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        No payments recorded yet.
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
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open)
          if (!open) {
            setPaymentAmount("")
            setPaymentError(null)
            setSavingPayment(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Amount</div>
            <Input
              type="number"
              inputMode="numeric"
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(e.target.value)
                setPaymentError(null)
              }}
              placeholder="e.g. 5000"
            />
            {paymentError && <div className="text-sm text-red-600">{paymentError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              disabled={!canCallApi || savingPayment}
              onClick={async () => {
                const tokenStr = token
                if (!tokenStr) return

                const amountNum = Number(paymentAmount)
                if (!Number.isFinite(amountNum) || amountNum <= 0) {
                  setPaymentError("Amount must be greater than zero")
                  return
                }

                try {
                  setSavingPayment(true)
                  setPaymentError(null)
                  await apiCreateCreditPayment(apiBaseUrl, tokenStr, creditId, { amount: amountNum })
                  await load(tokenStr)
                  setPaymentOpen(false)
                } catch (e) {
                  setPaymentError(getErrorMessage(e, "Failed to record payment"))
                } finally {
                  setSavingPayment(false)
                }
              }}
            >
              {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
