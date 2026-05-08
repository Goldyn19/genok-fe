"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CheckCircle, XCircle, Clock, Eye, ChevronRight } from "lucide-react"

import {
  apiApprovePurchase,
  apiGetPurchaseDetail,
  apiGetSalesApprovalStatus,
  apiGetSalesItem,
  apiListMyPurchases,
  apiListMySalesItems,
  apiListPendingApprovals,
  apiListPendingSalesApprovals,
  apiRejectPurchase,
  apiApproveSalesItem,
  apiRejectSalesItem,
  getApiBaseUrl,
  type ApiApprovalStep,
  type ApiPurchaseDetail,
  type ApiPurchaseListItem,
  type ApiSalesApprovalChainItem,
  type ApiSalesApprovalStatusResponse,
  type ApiSalesItem,
} from "@/lib/api"
import { getErrorMessage } from "@/lib/rbacUtils"
import { useUIStore } from "@/store/uiStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"

type TabKey = "purchase-pending" | "purchase-my" | "sales-pending" | "sales-my"

function statusColor(s: string) {
  switch (s) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200"
    case "failed":
      return "bg-red-100 text-red-800 border-red-200"
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200"
    case "approved":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
  }
}

function statusIcon(s: string) {
  switch (s) {
    case "confirmed":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return <Clock className="h-4 w-4 text-yellow-600" />
  }
}

function salesProgress(item: ApiSalesItem) {
  const total = item.approvals.length
  const done = item.approvals.filter((a) => a.status === "confirmed").length
  return total > 0 ? Math.round((done / total) * 100) : 0
}

function ApprovalStepRow({ step }: { step: ApiApprovalStep }) {
  const done = step.status === "confirmed"
  const rejected = step.status === "failed"
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? "bg-green-100" : rejected ? "bg-red-100" : "bg-yellow-100"
      }`}>
        {done ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : rejected ? (
          <XCircle className="h-4 w-4 text-red-600" />
        ) : (
          <span className="text-xs font-semibold text-yellow-700">{step.sequence}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Step {step.sequence}</span>
          <Badge variant="outline" className={`text-xs ${statusColor(step.status)}`}>
            {step.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {step.required_permission
            ? `Permission: ${step.required_permission}`
            : `Sequence: ${step.sequence}`}
        </p>
        {step.approved_by_details && (
          <p className="text-xs text-muted-foreground">
            By: {step.approved_by_details.full_name} ({step.approved_by_details.username})
          </p>
        )}
        {step.reason && (
          <p className="text-xs italic mt-1 text-foreground/80">&quot;{step.reason}&quot;</p>
        )}
        {step.approved_at && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(step.approved_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

function SalesChainStepRow({ step }: { step: ApiSalesApprovalChainItem }) {
  const done = step.status === "confirmed"
  const rejected = step.status === "failed"
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? "bg-green-100" : rejected ? "bg-red-100" : "bg-yellow-100"
      }`}>
        {done ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : rejected ? (
          <XCircle className="h-4 w-4 text-red-600" />
        ) : (
          <span className="text-xs font-semibold text-yellow-700">{step.step}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Step {step.step}</span>
          <Badge variant="outline" className={`text-xs ${statusColor(step.status)}`}>
            {step.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {step.required_permission ? `Permission: ${step.required_permission}` : `Sequence: ${step.step}`}
        </p>
        {step.approved_by && (
          <p className="text-xs text-muted-foreground">
            By: {step.approved_by.full_name} ({step.approved_by.username})
          </p>
        )}
        {step.reason && (
          <p className="text-xs italic mt-1 text-foreground/80">&quot;{step.reason}&quot;</p>
        )}
        {step.approved_at && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(step.approved_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

export function NotificationsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [activeTab, setActiveTab] = useState<TabKey>("purchase-pending")

  const [pending, setPending] = useState<ApiPurchaseListItem[]>([])
  const [myRequests, setMyRequests] = useState<ApiPurchaseListItem[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [myRequestsLoading, setMyRequestsLoading] = useState(true)
  const [pendingError, setPendingError] = useState<string | null>(null)
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null)

  const [salesPending, setSalesPending] = useState<ApiSalesItem[]>([])
  const [salesMy, setSalesMy] = useState<ApiSalesItem[]>([])
  const [salesPendingLoading, setSalesPendingLoading] = useState(true)
  const [salesMyLoading, setSalesMyLoading] = useState(true)
  const [salesPendingError, setSalesPendingError] = useState<string | null>(null)
  const [salesMyError, setSalesMyError] = useState<string | null>(null)

  const [requestFilter, setRequestFilter] = useState("")
  const [salesFilter, setSalesFilter] = useState("")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ApiPurchaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const setPendingApprovalCount = useUIStore((s) => s.setPendingApprovalCount)

  const [selectedSalesId, setSelectedSalesId] = useState<string | null>(null)
  const [salesDetail, setSalesDetail] = useState<ApiSalesItem | null>(null)
  const [salesStatus, setSalesStatus] = useState<ApiSalesApprovalStatusResponse | null>(null)
  const [salesDetailLoading, setSalesDetailLoading] = useState(false)
  const [salesDetailError, setSalesDetailError] = useState<string | null>(null)

  const [salesApproveOpen, setSalesApproveOpen] = useState(false)
  const [salesRejectOpen, setSalesRejectOpen] = useState(false)
  const [salesActionLoading, setSalesActionLoading] = useState(false)
  const [salesActionError, setSalesActionError] = useState<string | null>(null)
  const [salesApproveReason, setSalesApproveReason] = useState("")
  const [salesRejectReason, setSalesRejectReason] = useState("")

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [approveReason, setApproveReason] = useState("")
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router, sessionStatus, token])

  const canCallApi = Boolean(apiBaseUrl && token)

  useEffect(() => {
    if (!canCallApi) return
    let cancelled = false

    async function run() {
      try {
        setPendingLoading(true)
        setPendingError(null)
        const data = await apiListPendingApprovals(apiBaseUrl, token as string)
        if (cancelled) return
        setPending(data)
      } catch (e) {
        if (cancelled) return
        setPendingError(getErrorMessage(e, "Failed to load pending approvals"))
      } finally {
        if (!cancelled) setPendingLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, canCallApi, token])

  useEffect(() => {
    setPendingApprovalCount(pending.length + salesPending.length)
  }, [pending.length, salesPending.length, setPendingApprovalCount])

  useEffect(() => {
    if (!canCallApi) return
    let cancelled = false

    async function run() {
      try {
        setSalesPendingLoading(true)
        setSalesPendingError(null)
        const data = await apiListPendingSalesApprovals(apiBaseUrl, token as string)
        if (cancelled) return
        setSalesPending(data)
      } catch (e) {
        if (cancelled) return
        setSalesPendingError(getErrorMessage(e, "Failed to load pending sales approvals"))
      } finally {
        if (!cancelled) setSalesPendingLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, canCallApi, token])

  useEffect(() => {
    if (!canCallApi) return
    if (activeTab !== "purchase-my") return
    let cancelled = false

    async function run() {
      try {
        setMyRequestsLoading(true)
        setMyRequestsError(null)
        const data = await apiListMyPurchases(apiBaseUrl, token as string)
        if (cancelled) return
        setMyRequests(data)
      } catch (e) {
        if (cancelled) return
        setMyRequestsError(getErrorMessage(e, "Failed to load your requests"))
      } finally {
        if (!cancelled) setMyRequestsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [activeTab, apiBaseUrl, canCallApi, token])

  useEffect(() => {
    if (!canCallApi) return
    if (activeTab !== "sales-my") return
    let cancelled = false

    async function run() {
      try {
        setSalesMyLoading(true)
        setSalesMyError(null)
        const data = await apiListMySalesItems(apiBaseUrl, token as string)
        if (cancelled) return
        setSalesMy(data)
      } catch (e) {
        if (cancelled) return
        setSalesMyError(getErrorMessage(e, "Failed to load your sales"))
      } finally {
        if (!cancelled) setSalesMyLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [activeTab, apiBaseUrl, canCallApi, token])

  const loadDetail = useCallback(
    async (id: number) => {
      if (!canCallApi) return
      try {
        setDetailLoading(true)
        setDetailError(null)
        const d = await apiGetPurchaseDetail(apiBaseUrl, token as string, id)
        setDetail(d)
        setSelectedId(id)
      } catch (e) {
        setDetailError(getErrorMessage(e, "Failed to load details"))
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, token]
  )

  const loadSalesDetail = useCallback(
    async (id: string) => {
      if (!canCallApi) return
      try {
        setSalesDetailLoading(true)
        setSalesDetailError(null)
        const [d, s] = await Promise.all([
          apiGetSalesItem(apiBaseUrl, token as string, id),
          apiGetSalesApprovalStatus(apiBaseUrl, token as string, id),
        ])
        setSalesDetail(d)
        setSalesStatus(s)
        setSelectedSalesId(id)
      } catch (e) {
        setSalesDetailError(getErrorMessage(e, "Failed to load sales details"))
        setSalesDetail(null)
        setSalesStatus(null)
      } finally {
        setSalesDetailLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, token]
  )

  const handleApprove = async () => {
    if (!selectedId || !canCallApi) return
    setActionLoading(true)
    setActionError(null)
    try {
      const tokenStr = token as string
      await apiApprovePurchase(apiBaseUrl, tokenStr, selectedId, approveReason || undefined)
      setApproveOpen(false)
      setApproveReason("")
      const newPending = pending.filter((p) => p.id !== selectedId)
      setPending(newPending)
      await loadDetail(selectedId)
      const myUpdated = await apiListMyPurchases(apiBaseUrl, tokenStr)
      setMyRequests(myUpdated)
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to approve"))
    } finally {
      setActionLoading(false)
    }
  }

  const handleSalesApprove = async () => {
    if (!selectedSalesId || !canCallApi) return
    setSalesActionLoading(true)
    setSalesActionError(null)
    try {
      const tokenStr = token as string
      await apiApproveSalesItem(apiBaseUrl, tokenStr, selectedSalesId, salesApproveReason || undefined)
      setSalesApproveOpen(false)
      setSalesApproveReason("")
      setSalesPending((prev) => prev.filter((x) => x.id !== selectedSalesId))
      await loadSalesDetail(selectedSalesId)
      const myUpdated = await apiListMySalesItems(apiBaseUrl, tokenStr)
      setSalesMy(myUpdated)
    } catch (e) {
      setSalesActionError(getErrorMessage(e, "Failed to approve sale"))
    } finally {
      setSalesActionLoading(false)
    }
  }

  const handleSalesReject = async () => {
    if (!selectedSalesId || !canCallApi) return
    if (!salesRejectReason.trim()) {
      setSalesActionError("Rejection reason is required")
      return
    }
    setSalesActionLoading(true)
    setSalesActionError(null)
    try {
      const tokenStr = token as string
      await apiRejectSalesItem(apiBaseUrl, tokenStr, selectedSalesId, salesRejectReason.trim())
      setSalesRejectOpen(false)
      setSalesRejectReason("")
      setSalesPending((prev) => prev.filter((x) => x.id !== selectedSalesId))
      await loadSalesDetail(selectedSalesId)
      const myUpdated = await apiListMySalesItems(apiBaseUrl, tokenStr)
      setSalesMy(myUpdated)
    } catch (e) {
      setSalesActionError(getErrorMessage(e, "Failed to reject sale"))
    } finally {
      setSalesActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedId || !canCallApi) return
    if (!rejectReason.trim()) {
      setActionError("Rejection reason is required")
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      const tokenStr = token as string
      await apiRejectPurchase(apiBaseUrl, tokenStr, selectedId, rejectReason.trim())
      setRejectOpen(false)
      setRejectReason("")
      const newPending = pending.filter((p) => p.id !== selectedId)
      setPending(newPending)
      await loadDetail(selectedId)
      const myUpdated = await apiListMyPurchases(apiBaseUrl, tokenStr)
      setMyRequests(myUpdated)
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to reject"))
    } finally {
      setActionLoading(false)
    }
  }

  const filteredMyRequests = myRequests.filter(
    (p) =>
      !requestFilter ||
      p.name.toLowerCase().includes(requestFilter.toLowerCase()) ||
      p.part_number.toLowerCase().includes(requestFilter.toLowerCase()) ||
      p.status.toLowerCase().includes(requestFilter.toLowerCase())
  )

  const filteredSalesMy = salesMy.filter(
    (s) =>
      !salesFilter ||
      s.part_name.toLowerCase().includes(salesFilter.toLowerCase()) ||
      s.part_number.toLowerCase().includes(salesFilter.toLowerCase()) ||
      s.status.toLowerCase().includes(salesFilter.toLowerCase())
  )

  const selectedPending = pending.find((p) => p.id === selectedId)
  const selectedSalesPending = salesPending.find((s) => s.id === selectedSalesId)

  const purchasePendingCount = pending.length
  const salesPendingCount = salesPending.length
  const totalPendingCount = purchasePendingCount + salesPendingCount

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Approve or reject purchase and sales requests, and track the status of your own requests.
          </p>
        </div>
        {totalPendingCount > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm px-3 py-1">
            {totalPendingCount} pending
          </Badge>
        )}
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("purchase-pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
            activeTab === "purchase-pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Purchase Approvals
          {purchasePendingCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold text-yellow-800">
              {purchasePendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("purchase-my")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "purchase-my"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Purchases
        </button>
        <button
          onClick={() => setActiveTab("sales-pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${
            activeTab === "sales-pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Sales Approvals
          {salesPendingCount > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold text-yellow-800">
              {salesPendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("sales-my")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "sales-my"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Sales
        </button>
      </div>

      {activeTab === "purchase-pending" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Purchase Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            )}
            {pendingError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {pendingError}
              </div>
            )}
            {!pendingLoading && !pendingError && pending.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No pending approvals. You&apos;re all caught up!
              </p>
            )}
            {!pendingLoading && !pendingError && pending.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">#{p.id}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.part_number}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{p.total_amount}</TableCell>
                      <TableCell>{p.location_details?.location ?? p.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${p.approval_progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{p.approval_progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{p.created_by_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => loadDetail(p.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setSelectedId(p.id)
                              setApproveOpen(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedId(p.id)
                              setRejectOpen(true)
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "purchase-my" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Purchases</CardTitle>
              <Input
                placeholder="Filter by name, part number, status..."
                value={requestFilter}
                onChange={(e) => setRequestFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {myRequestsLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            )}
            {myRequestsError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {myRequestsError}
              </div>
            )}
            {!myRequestsLoading && !myRequestsError && myRequests.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No purchase requests yet.
              </p>
            )}
            {!myRequestsLoading && !myRequestsError && filteredMyRequests.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMyRequests.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">#{p.id}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="font-mono text-xs">{p.part_number}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{p.total_amount}</TableCell>
                      <TableCell>{p.location_details?.location ?? p.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(p.status)}>
                          <span className="flex items-center gap-1">
                            {statusIcon(p.status)}
                            {p.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${p.approval_progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{p.approval_progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => loadDetail(p.id)}>
                          <Eye className="h-4 w-4" />
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "sales-pending" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sales Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {salesPendingLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            )}
            {salesPendingError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {salesPendingError}
              </div>
            )}
            {!salesPendingLoading && !salesPendingError && salesPending.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No pending sales approvals.
              </p>
            )}
            {!salesPendingLoading && !salesPendingError && salesPending.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesPending.map((s) => {
                    const progress = salesProgress(s)
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.id}</TableCell>
                        <TableCell>{s.part_name}</TableCell>
                        <TableCell className="font-mono text-xs">{s.part_number}</TableCell>
                        <TableCell>{s.quantity}</TableCell>
                        <TableCell>{s.unit_price}</TableCell>
                        <TableCell>{s.total_price}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => loadSalesDetail(s.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setSelectedSalesId(s.id)
                                setSalesApproveOpen(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedSalesId(s.id)
                                setSalesRejectOpen(true)
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "sales-my" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Sales</CardTitle>
              <Input
                placeholder="Filter by part, part number, status..."
                value={salesFilter}
                onChange={(e) => setSalesFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {salesMyLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            )}
            {salesMyError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {salesMyError}
              </div>
            )}
            {!salesMyLoading && !salesMyError && salesMy.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No sales yet.
              </p>
            )}
            {!salesMyLoading && !salesMyError && filteredSalesMy.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalesMy.map((s) => {
                    const progress = salesProgress(s)
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.id}</TableCell>
                        <TableCell>{s.part_name}</TableCell>
                        <TableCell className="font-mono text-xs">{s.part_number}</TableCell>
                        <TableCell>{s.quantity}</TableCell>
                        <TableCell>{s.unit_price}</TableCell>
                        <TableCell>{s.total_price}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor(s.status)}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => loadSalesDetail(s.id)}>
                            <Eye className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Purchase Request #{selectedId}
            </SheetTitle>
          </SheetHeader>

          {detailLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading details...</div>
          )}

          {detailError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mt-4">
              {detailError}
            </div>
          )}

          {detail && !detailLoading && !detailError && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{detail.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Part Number</p>
                  <p className="font-mono">{detail.part_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium">{detail.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{detail.total_amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p>{detail.location_details?.location ?? detail.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColor(detail.status)}>
                    <span className="flex items-center gap-1">
                      {statusIcon(detail.status)}
                      {detail.status}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested By</p>
                  <p>{detail.created_by_details.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{detail.created_by_details.username}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">New Product</p>
                  <p>{detail.is_new_product ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{new Date(detail.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p>{new Date(detail.updated_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Approval Chain</h3>
                <div className="space-y-4">
                  {detail.approvals.map((step) => (
                    <ApprovalStepRow key={step.id} step={step} />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {detail.can_current_user_approve && (
                  <>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setApproveOpen(true)
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => {
                        setRejectOpen(true)
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                {detail.can_current_user_approve === false && detail.status === "pending" && (
                  <p className="text-sm text-muted-foreground text-center w-full py-2">
                    Waiting for your turn in the approval chain.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Purchase Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve purchase request #{selectedId}?
              {selectedPending && (
                <span className="block mt-1">
                  <strong>{selectedPending.name}</strong> — {selectedPending.quantity} × {selectedPending.total_amount}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              placeholder="Add a note for your approval..."
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
            />
          </div>
          {actionError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting purchase request #{selectedId}.
              {selectedPending && (
                <span className="block mt-1">
                  <strong>{selectedPending.name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason *</label>
            <Input
              placeholder="Why are you rejecting this request?"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          {actionError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason("") }} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={selectedSalesId !== null} onOpenChange={(open) => !open && setSelectedSalesId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Sales Item {selectedSalesId}
            </SheetTitle>
          </SheetHeader>

          {salesDetailLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading details...</div>
          )}

          {salesDetailError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mt-4">
              {salesDetailError}
            </div>
          )}

          {salesDetail && salesStatus && !salesDetailLoading && !salesDetailError && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Part</p>
                  <p className="font-medium">{salesDetail.part_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Part Number</p>
                  <p className="font-mono">{salesDetail.part_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium">{salesDetail.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="font-medium">{salesDetail.unit_price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-medium">{salesDetail.total_price}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColor(salesStatus.status)}>
                    {salesStatus.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{new Date(salesStatus.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approval Progress</p>
                  <p>{salesStatus.progress_percentage}%</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Approval Chain</h3>
                <div className="space-y-4">
                  {salesStatus.approval_chain.map((step) => (
                    <SalesChainStepRow key={step.step} step={step} />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {salesStatus.can_approve && (
                  <>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setSalesApproveOpen(true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => setSalesRejectOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                {!salesStatus.can_approve && salesStatus.status === "pending" && (
                  <p className="text-sm text-muted-foreground text-center w-full py-2">
                    Waiting for your turn in the approval chain.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={salesApproveOpen} onOpenChange={setSalesApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this sales item?
              {selectedSalesPending && (
                <span className="block mt-1">
                  <strong>{selectedSalesPending.part_name}</strong> — {selectedSalesPending.quantity} × {selectedSalesPending.unit_price}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              placeholder="Add a note for your approval..."
              value={salesApproveReason}
              onChange={(e) => setSalesApproveReason(e.target.value)}
            />
          </div>
          {salesActionError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {salesActionError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalesApproveOpen(false)} disabled={salesActionLoading}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSalesApprove}
              disabled={salesActionLoading}
            >
              {salesActionLoading ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={salesRejectOpen} onOpenChange={setSalesRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Sale</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this sales item.
              {selectedSalesPending && (
                <span className="block mt-1">
                  <strong>{selectedSalesPending.part_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason *</label>
            <Input
              placeholder="Why are you rejecting this sale?"
              value={salesRejectReason}
              onChange={(e) => setSalesRejectReason(e.target.value)}
            />
          </div>
          {salesActionError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {salesActionError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSalesRejectOpen(false)
                setSalesRejectReason("")
              }}
              disabled={salesActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSalesReject}
              disabled={salesActionLoading}
            >
              {salesActionLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
