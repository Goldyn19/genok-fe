"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, Plus, Receipt, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"

import {
  apiAddItemToCart,
  apiCheckoutCart,
  apiCreateCreditCustomer,
  apiListCreditCustomers,
  apiGetCart,
  apiRemoveCartItem,
  apiSearchUsers,
  apiSearchStock,
  apiUpdateCart,
  apiUpdateCartItem,
  getApiBaseUrl,
  type ApiCart,
  type ApiCreditCustomer,
  type ApiStock,
  type RbacUser,
} from "@/lib/api"
import { formatMoney } from "@/lib/cartUtils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function formatDateTime(ts: string) {
  return new Date(ts).toLocaleString()
}

function salesStatusLabel(status: NonNullable<ApiCart["sales_order"]>["status"]) {
  switch (status) {
    case "approved":
      return "Approved"
    case "rejected":
      return "Rejected"
    case "cancelled":
      return "Cancelled"
    case "returned":
      return "Returned"
    default:
      return "Pending approval"
  }
}

function salesStatusVariant(status: NonNullable<ApiCart["sales_order"]>["status"]): "default" | "secondary" | "danger" | "outline" {
  switch (status) {
    case "approved":
      return "default"
    case "rejected":
    case "cancelled":
      return "danger"
    case "returned":
      return "outline"
    default:
      return "secondary"
  }
}

function toDateTimeLocalValue(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function userLabel(user: RbacUser) {
  return user.full_name?.trim() || user.email || user.username
}

export function CartDetailsPage() {
  const params = useParams<{ cartId: string }>()
  const cartId = params.cartId
  const router = useRouter()

  const { data: session, status: sessionStatus } = useSession()
  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [cart, setCart] = useState<ApiCart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState("")
  const [savingCustomer, setSavingCustomer] = useState(false)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState<"pay" | "credit">("pay")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "pos">("cash")
  const [creditCustomers, setCreditCustomers] = useState<ApiCreditCustomer[]>([])
  const [creditCustomerId, setCreditCustomerId] = useState("")
  const [creditLoading, setCreditLoading] = useState(false)
  const [creditError, setCreditError] = useState<string | null>(null)
  const [newCreditCustomerName, setNewCreditCustomerName] = useState("")
  const [creatingCreditCustomer, setCreatingCreditCustomer] = useState(false)
  const [soldAtInput, setSoldAtInput] = useState("")
  const [soldByQuery, setSoldByQuery] = useState("")
  const [soldByResults, setSoldByResults] = useState<RbacUser[]>([])
  const [soldByLoading, setSoldByLoading] = useState(false)
  const [soldByError, setSoldByError] = useState<string | null>(null)
  const [selectedSoldBy, setSelectedSoldBy] = useState<RbacUser | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const [stockQueryInput, setStockQueryInput] = useState("")
  const [stockQuery, setStockQuery] = useState("")
  const [stockResults, setStockResults] = useState<ApiStock[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState<ApiStock | null>(null)
  const [addQty, setAddQty] = useState(1)
  const [addUnitPrice, setAddUnitPrice] = useState<number>(0)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`/carts/${cartId}`)}`)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGetCart(apiBaseUrl, token, cartId)
        if (cancelled) return
        setCart(data)
        setCustomerName(data.customer_name)
      } catch (e) {
        if (cancelled) return
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to load cart"
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, cartId, router, sessionStatus, token])

  useEffect(() => {
    if (!addOpen) return
    setStockQueryInput("")
    setStockQuery("")
    setStockResults([])
    setSelectedStock(null)
    setAddQty(1)
    setAddUnitPrice(0)
    setAdding(false)
  }, [addOpen])

  useEffect(() => {
    if (!checkoutOpen) return
    setCheckoutMode("pay")
    setPaymentMethod("cash")
    setCheckoutError(null)
    setCheckingOut(false)
    setCreditCustomers([])
    setCreditCustomerId("")
    setCreditLoading(false)
    setCreditError(null)
    setNewCreditCustomerName(cart?.customer_name ?? "")
    setCreatingCreditCustomer(false)
    setSoldAtInput("")
    setSoldByQuery("")
    setSoldByResults([])
    setSoldByLoading(false)
    setSoldByError(null)
    setSelectedSoldBy(null)
  }, [cart?.customer_name, checkoutOpen])

  useEffect(() => {
    if (!checkoutOpen) return
    if (!token) return
    const term = soldByQuery.trim()
    if (term.length < 2) {
      setSoldByResults([])
      setSoldByLoading(false)
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      try {
        setSoldByLoading(true)
        setSoldByError(null)
        const users = await apiSearchUsers(apiBaseUrl, token, term)
        if (cancelled) return
        setSoldByResults(users)
      } catch (e) {
        if (cancelled) return
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to search users"
        setSoldByError(message)
        setSoldByResults([])
      } finally {
        if (!cancelled) setSoldByLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [apiBaseUrl, checkoutOpen, soldByQuery, token])

  useEffect(() => {
    if (!addOpen) return
    if (!token) return
    const q = stockQuery.trim()
    if (q.length < 1) {
      setStockResults([])
      setStockLoading(false)
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      try {
        setStockLoading(true)
        const results = await apiSearchStock(apiBaseUrl, token, q)
        if (cancelled) return
        setStockResults(results)
      } catch {
        if (cancelled) return
        setStockResults([])
      } finally {
        if (!cancelled) setStockLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [addOpen, apiBaseUrl, stockQuery, token])

  useEffect(() => {
    if (!checkoutOpen) return
    if (!token) return
    let cancelled = false

    ;(async () => {
      try {
        setCreditLoading(true)
        setCreditError(null)
        const data = await apiListCreditCustomers(apiBaseUrl, token)
        if (cancelled) return
        setCreditCustomers(data)
        if (!creditCustomerId) {
          const match = data.find((c) => String(c.customer_name).toLowerCase() === String(cart?.customer_name ?? "").toLowerCase())
          if (match) setCreditCustomerId(match.credit_id)
        }
      } catch (e) {
        if (cancelled) return
        setCreditCustomers([])
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to load credit customers"
        setCreditError(message)
      } finally {
        if (!cancelled) setCreditLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, cart?.customer_name, checkoutOpen, creditCustomerId, token])

  const subtotal = useMemo(() => {
    if (!cart) return 0
    return cart.items.reduce((sum, it) => sum + it.quantity * Number(it.unit_price ?? 0), 0)
  }, [cart])

  const salesOrder = cart?.sales_order ?? null

  const canEdit = cart ? !cart.is_checked_out : false
  const canCheckout = cart ? !cart.is_checked_out && cart.items.length > 0 : false

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>
  }

  if (!cart) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cart not found</h1>
          <p className="text-sm text-muted-foreground">This cart doesn’t exist or you don’t have access.</p>
        </div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <Button asChild variant="outline">
          <Link href="/carts">Back to carts</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/carts">
              Carts
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{cart.customer_name}</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Cart Details</h1>
          <div className="flex flex-wrap items-center gap-2">
            {cart.is_checked_out ? <Badge variant="secondary">Checked out</Badge> : <Badge variant="outline">Open</Badge>}
            <Badge variant="outline">{cart.items.length} items</Badge>
            <Badge variant="secondary">ID {cart.id}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/carts")}>
            Back
          </Button>
          <Button className="gap-2" disabled={!canCheckout} onClick={() => setCheckoutOpen(true)}>
            <Receipt className="h-4 w-4" />
            Checkout
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-3 md:grid-cols-[1fr_260px]">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Customer name</div>
                  <Input
                    value={customerName}
                    disabled={!canEdit}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onBlur={async () => {
                      if (!token) return
                      const next = customerName.trim()
                      if (!next || next === cart.customer_name) {
                        setCustomerName(cart.customer_name)
                        return
                      }
                      try {
                        setSavingCustomer(true)
                        const updated = await apiUpdateCart(apiBaseUrl, token, cart.id, { customer_name: next })
                        setCart(updated)
                        setCustomerName(updated.customer_name)
                      } catch (e) {
                        const message =
                          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                            ? ((e as { message?: unknown }).message as string)
                            : "Failed to update customer"
                        setError(message)
                        setCustomerName(cart.customer_name)
                      } finally {
                        setSavingCustomer(false)
                      }
                    }}
                  />
                  {savingCustomer && <div className="text-xs text-muted-foreground">Saving…</div>}
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Updated</div>
                  <div className="text-sm text-foreground">{formatDateTime(cart.updated_at)}</div>
                  {cart.checked_out_at && (
                    <div className="text-xs text-muted-foreground">Checked out at {formatDateTime(cart.checked_out_at)}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Items</CardTitle>
                <Button variant="outline" size="sm" className="gap-2" disabled={!canEdit} onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[120px]">Qty</TableHead>
                      <TableHead className="w-[160px]">Unit price</TableHead>
                      <TableHead className="w-[160px]">Subtotal</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No items yet. Add one to start pricing.
                        </TableCell>
                      </TableRow>
                    )}
                    {cart.items.map((it) => {
                      const lineSubtotal = it.quantity * Number(it.unit_price ?? 0)
                      return (
                        <TableRow key={it.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{it.part_name}</div>
                            <div className="text-xs text-muted-foreground">{it.part_number}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={String(it.quantity)}
                              disabled={!canEdit}
                              onChange={(e) => {
                                const raw = Number(e.target.value)
                                const next = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
                                setCart((prev) => {
                                  if (!prev) return prev
                                  return { ...prev, items: prev.items.map((p) => (p.id === it.id ? { ...p, quantity: next } : p)) }
                                })
                              }}
                              onBlur={async () => {
                                if (!token) return
                                try {
                                  const updated = await apiUpdateCartItem(apiBaseUrl, token, it.id, { quantity: it.quantity })
                                  setCart((prev) => {
                                    if (!prev) return prev
                                    return { ...prev, items: prev.items.map((p) => (p.id === updated.id ? updated : p)) }
                                  })
                                } catch (e) {
                                  const message =
                                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                                      ? ((e as { message?: unknown }).message as string)
                                      : "Failed to update item"
                                  setError(message)
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={String(it.unit_price)}
                              disabled={!canEdit}
                              onChange={(e) => {
                                const raw = Number(e.target.value)
                                const next = Number.isFinite(raw) && raw >= 0 ? raw : 0
                                setCart((prev) => {
                                  if (!prev) return prev
                                  return {
                                    ...prev,
                                    items: prev.items.map((p) => (p.id === it.id ? { ...p, unit_price: String(next) } : p)),
                                  }
                                })
                              }}
                              onBlur={async () => {
                                if (!token) return
                                try {
                                  const updated = await apiUpdateCartItem(apiBaseUrl, token, it.id, { unit_price: Number(it.unit_price) })
                                  setCart((prev) => {
                                    if (!prev) return prev
                                    return { ...prev, items: prev.items.map((p) => (p.id === updated.id ? updated : p)) }
                                  })
                                } catch (e) {
                                  const message =
                                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                                      ? ((e as { message?: unknown }).message as string)
                                      : "Failed to update item"
                                  setError(message)
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">{formatMoney(lineSubtotal)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={!canEdit}
                              onClick={async () => {
                                if (!token) return
                                try {
                                  await apiRemoveCartItem(apiBaseUrl, token, it.id)
                                  setCart((prev) => {
                                    if (!prev) return prev
                                    return { ...prev, items: prev.items.filter((p) => p.id !== it.id) }
                                  })
                                } catch (e) {
                                  const message =
                                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                                      ? ((e as { message?: unknown }).message as string)
                                      : "Failed to remove item"
                                  setError(message)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
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

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Approval status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!salesOrder ? (
                <div className="text-sm text-muted-foreground">No sales order yet. Checkout the cart to start the approval flow.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={salesStatusVariant(salesOrder.status)}>{salesStatusLabel(salesOrder.status)}</Badge>
                    <Badge variant="outline">{salesOrder.approval_progress}% complete</Badge>
                    {salesOrder.current_step ? <Badge variant="outline">Current step: {salesOrder.current_step}</Badge> : null}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-muted-foreground">Sales order</div>
                      <div className="font-medium text-foreground">{salesOrder.id}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-muted-foreground">Sold at</div>
                      <div className="text-right text-foreground">{formatDateTime(salesOrder.sold_at)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-muted-foreground">Payment method</div>
                      <div className="text-right text-foreground">{salesOrder.payment_method ? salesOrder.payment_method.replaceAll("_", " ") : "—"}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Subtotal</div>
                <div className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(subtotal)}</div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-base font-semibold tabular-nums text-foreground">{formatMoney(subtotal)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cart.is_checked_out ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Cart is checked out and locked.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Checkout to lock prices and finalize the order.</div>
              )}

              <Button className="w-full gap-2" disabled={!canCheckout} onClick={() => setCheckoutOpen(true)}>
                <Receipt className="h-4 w-4" />
                Checkout cart
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Checkout cart</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Confirm checkout for:</div>
            <div className="text-sm font-semibold text-foreground">{cart.customer_name}</div>
            <div className="rounded-md border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(subtotal)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Checkout option</div>
              <Select
                value={checkoutMode}
                onChange={(v) => setCheckoutMode(v === "credit" ? "credit" : "pay")}
                options={[
                  { value: "pay", label: "Payment (pay now)" },
                  { value: "credit", label: "Add to customer credit" },
                ]}
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div>
                <div className="text-sm font-medium text-foreground">Historical sale details</div>
                <div className="text-xs text-muted-foreground">Optional. Leave empty for a normal checkout using your account and the current time.</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Actual sale time</div>
                <Input
                  type="datetime-local"
                  max={toDateTimeLocalValue(new Date())}
                  value={soldAtInput}
                  onChange={(e) => {
                    setSoldAtInput(e.target.value)
                    setCheckoutError(null)
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Actual salesperson</div>
                {selectedSoldBy && (
                  <div className="flex items-center justify-between rounded-md border bg-card p-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{userLabel(selectedSoldBy)}</div>
                      <div className="text-xs text-muted-foreground">{selectedSoldBy.email}</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSoldBy(null)
                        setSoldByQuery("")
                        setSoldByResults([])
                        setSoldByError(null)
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
                <Input
                  value={soldByQuery}
                  onChange={(e) => {
                    setSoldByQuery(e.target.value)
                    setSoldByError(null)
                    setCheckoutError(null)
                  }}
                  placeholder="Search users by name or email"
                />
                {soldByError && <div className="text-sm text-red-600">{soldByError}</div>}
                {soldByLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching users…
                  </div>
                ) : soldByQuery.trim().length >= 2 && soldByResults.length > 0 ? (
                  <div className="max-h-40 overflow-auto rounded-md border">
                    {soldByResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="flex w-full items-center justify-between border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/40"
                        onClick={() => {
                          setSelectedSoldBy(user)
                          setSoldByQuery(userLabel(user))
                          setSoldByResults([])
                          setSoldByError(null)
                        }}
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">{userLabel(user)}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{user.is_active ? "Active" : "Inactive"}</div>
                      </button>
                    ))}
                  </div>
                ) : soldByQuery.trim().length >= 2 ? (
                  <div className="text-xs text-muted-foreground">No users found.</div>
                ) : null}
              </div>
            </div>

            {checkoutMode === "pay" ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Payment method</div>
                <Select
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v === "bank_transfer" ? "bank_transfer" : v === "pos" ? "pos" : "cash")}
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "bank_transfer", label: "Bank transfer" },
                    { value: "pos", label: "POS" },
                  ]}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Credit customer</div>
                {creditError && <div className="text-sm text-red-600">{creditError}</div>}
                {creditLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading customers…
                  </div>
                ) : (
                  <Select
                    value={creditCustomerId}
                    onChange={setCreditCustomerId}
                    options={[
                      { value: "", label: "Select customer…" },
                      ...creditCustomers.map((c) => ({ value: c.credit_id, label: c.customer_name })),
                    ]}
                  />
                )}

                <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                  <Input
                    value={newCreditCustomerName}
                    onChange={(e) => {
                      setNewCreditCustomerName(e.target.value)
                      setCheckoutError(null)
                    }}
                    placeholder="New customer name"
                  />
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!token || creatingCreditCustomer}
                    onClick={async () => {
                      if (!token) return
                      const name = newCreditCustomerName.trim()
                      if (!name) {
                        setCheckoutError("Customer name is required")
                        return
                      }
                      try {
                        setCreatingCreditCustomer(true)
                        setCheckoutError(null)
                        const created = await apiCreateCreditCustomer(apiBaseUrl, token, { customer_name: name })
                        setCreditCustomers((prev) => {
                          const next = [created, ...prev].slice()
                          next.sort((a, b) => String(a.customer_name).localeCompare(String(b.customer_name)))
                          return next
                        })
                        setCreditCustomerId(created.credit_id)
                      } catch (e) {
                        const message =
                          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                            ? ((e as { message?: unknown }).message as string)
                            : "Failed to create credit customer"
                        setCheckoutError(message)
                      } finally {
                        setCreatingCreditCustomer(false)
                      }
                    }}
                  >
                    {creatingCreditCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create
                  </Button>
                </div>
              </div>
            )}

            {checkoutError && <div className="text-sm text-red-600">{checkoutError}</div>}
            <div className="text-xs text-muted-foreground">After checkout, this cart becomes read-only.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={checkingOut} onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={checkingOut || !token || (checkoutMode === "credit" && !creditCustomerId)}
              className="gap-2"
              onClick={async () => {
                if (!token) return
                try {
                  let soldAtIso: string | undefined
                  if (soldAtInput.trim()) {
                    const parsed = new Date(soldAtInput)
                    if (Number.isNaN(parsed.getTime())) {
                      setCheckoutError("Enter a valid sale date and time")
                      return
                    }
                    if (parsed.getTime() > Date.now()) {
                      setCheckoutError("Sale date cannot be in the future")
                      return
                    }
                    soldAtIso = parsed.toISOString()
                  }

                  const payload: {
                    payment_method: "cash" | "bank_transfer" | "pos" | "credit"
                    credit_customer_id?: string
                    sold_at?: string
                    sold_by?: number
                  } =
                    checkoutMode === "credit"
                      ? { payment_method: "credit", credit_customer_id: creditCustomerId }
                      : { payment_method: paymentMethod }

                  if (soldAtIso) payload.sold_at = soldAtIso
                  if (selectedSoldBy) payload.sold_by = selectedSoldBy.id

                  setCheckingOut(true)
                  setCheckoutError(null)
                  const updated = await apiCheckoutCart(apiBaseUrl, token, cart.id, payload)
                  setCart(updated)
                  setCustomerName(updated.customer_name)
                  setCheckoutOpen(false)
                } catch (e) {
                  const message =
                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                      ? ((e as { message?: unknown }).message as string)
                      : "Failed to checkout"
                  setCheckoutError(message)
                } finally {
                  setCheckingOut(false)
                }
              }}
            >
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add item</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Search stock by part name/number. Press Enter to search.</div>
              <Input
                value={stockQueryInput}
                onChange={(e) => setStockQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setStockQuery(stockQueryInput.trim())
                  }
                }}
                placeholder="e.g. 12V or ABC-123"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead className="w-[140px]">Balance</TableHead>
                    <TableHead className="w-[160px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLoading && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Searching…
                      </TableCell>
                    </TableRow>
                  )}
                  {!stockLoading && stockQuery.trim().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Type a search term and press Enter.
                      </TableCell>
                    </TableRow>
                  )}
                  {!stockLoading && stockQuery.trim().length > 0 && stockResults.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        No stock found.
                      </TableCell>
                    </TableRow>
                  )}
                  {!stockLoading &&
                    stockResults.map((s) => (
                      <TableRow key={s.id} className="cursor-pointer" onClick={() => {
                        setSelectedStock(s)
                        setAddUnitPrice(s.price ?? 0)
                      }}>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{s.part_name}</div>
                          <div className="text-xs text-muted-foreground">{s.part_number}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {s.brand?.trim() ? <span className="text-xs text-muted-foreground">{s.brand}</span> : null}
                            <Badge variant="outline">{(s.is_caterpillar ?? true) ? "CAT" : "Non-CAT"}</Badge>
                            <Badge variant="outline">{(s.is_original ?? true) ? "Original" : "Aftermarket"}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">{s.display_balance}</TableCell>
                        <TableCell className="text-right">
                          <Button variant={selectedStock?.id === s.id ? "default" : "outline"} size="sm">
                            {selectedStock?.id === s.id ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Quantity</div>
                <Input type="number" min={1} step={1} value={String(addQty)} onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Unit price</div>
                <Input type="number" min={0} step={0.01} value={String(addUnitPrice)} onChange={(e) => setAddUnitPrice(Math.max(0, Number(e.target.value)))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button
              disabled={!token || !selectedStock || adding}
              onClick={async () => {
                if (!token || !selectedStock) return
                try {
                  setAdding(true)
                  await apiAddItemToCart(apiBaseUrl, token, cart.id, {
                    product: selectedStock.id,
                    quantity: addQty,
                    unit_price: addUnitPrice,
                  })
                  const updated = await apiGetCart(apiBaseUrl, token, cart.id)
                  setCart(updated)
                  setCustomerName(updated.customer_name)
                  setAddOpen(false)
                } catch (e) {
                  const message =
                    typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                      ? ((e as { message?: unknown }).message as string)
                      : "Failed to add item"
                  setError(message)
                } finally {
                  setAdding(false)
                }
              }}
            >
              {adding ? "Adding…" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
