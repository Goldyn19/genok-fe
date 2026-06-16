"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CheckCircle, XCircle, Clock, Eye, ChevronRight, Pencil } from "lucide-react"

import {
  apiApprovePurchase,
  apiGetPurchaseDetail,
  apiListLocations,
  apiListMyPurchasesPage,
  apiListMyActionsPage,
  apiListPendingApprovalsPage,
  apiGetSalesApprovalStatus,
  apiGetSalesItem,
  apiListMySalesItems,
  apiListPendingSalesApprovals,
  apiRejectPurchase,
  apiApproveSalesItem,
  apiRejectSalesItem,
  apiRevokeMyAction,
  apiUpdatePurchase,
  getApiBaseUrl,
  type ApiApprovalStep,
  type ApiLocation,
  type ApiPurchaseDetail,
  type ApiPurchaseListItem,
  type ApiMyActionItem,
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
import { Select } from "@/components/ui/select"

type TabKey = "purchase-pending" | "purchase-my" | "sales-pending" | "sales-my" | "my-actions"
type PurchaseEditDraft = {
  name: string
  part_number: string
  quantity: string
  price: string
  location: string
  brand: string
  is_caterpillar: boolean
  is_original: boolean
  is_new_product: boolean
}
const PURCHASE_PAGE_SIZE = 10

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

function canEditPurchase(item: ApiPurchaseListItem) {
  return item.status === "pending" && item.approval_progress === 0
}

type PaginationControlsProps = {
  currentPage: number
  totalPages: number
  visibleCount: number
  totalCount: number
  onPageChange: (page: number) => void
}

function PaginationControls({
  currentPage,
  totalPages,
  visibleCount,
  totalCount,
  onPageChange,
}: PaginationControlsProps) {
  const [pageInput, setPageInput] = useState(String(currentPage))

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  function jumpToPage() {
    const parsedPage = Number.parseInt(pageInput, 10)
    if (!Number.isFinite(parsedPage)) {
      setPageInput(String(currentPage))
      return
    }

    const nextPage = Math.min(totalPages, Math.max(1, parsedPage))
    onPageChange(nextPage)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{visibleCount}</span> of{" "}
        <span className="font-medium text-foreground">{totalCount}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
        >
          Prev
        </Button>
        <div className="text-xs text-muted-foreground tabular-nums">
          Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </div>
        <Input
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") jumpToPage()
          }}
          className="h-8 w-20"
        />
        <Button variant="outline" size="sm" onClick={jumpToPage}>
          Go
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
        >
          Last
        </Button>
      </div>
    </div>
  )
}

function ApprovalStepRow({ step }: { step: ApiApprovalStep }) {
  const done = step.status === "confirmed"
  const rejected = step.status === "failed"
  const approvers = step.required_permission_users ?? []
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
          {approvers.length > 0
            ? `Approvers: ${approvers.map((u) => u.full_name || u.email || u.username).join(", ")}`
            : "Approvers: —"}
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
  const [pendingCount, setPendingCount] = useState(0)
  const [myRequestsCount, setMyRequestsCount] = useState(0)
  const [pendingPage, setPendingPage] = useState(1)
  const [myRequestsPage, setMyRequestsPage] = useState(1)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [myRequestsLoading, setMyRequestsLoading] = useState(true)
  const [pendingError, setPendingError] = useState<string | null>(null)
  const [myRequestsError, setMyRequestsError] = useState<string | null>(null)

  const [salesPending, setSalesPending] = useState<ApiSalesItem[]>([])
  const [salesMy, setSalesMy] = useState<ApiSalesItem[]>([])
  const [salesPendingLoading, setSalesPendingLoading] = useState(false)
  const [salesMyLoading, setSalesMyLoading] = useState(true)
  const [salesPendingError, setSalesPendingError] = useState<string | null>(null)
  const [salesMyError, setSalesMyError] = useState<string | null>(null)
  const [salesPendingLoaded, setSalesPendingLoaded] = useState(false)

  const [pendingFilterInput, setPendingFilterInput] = useState("")
  const [pendingFilter, setPendingFilter] = useState("")
  const [requestFilter, setRequestFilter] = useState("")
  const [salesFilter, setSalesFilter] = useState("")
  const [myActionsFilter, setMyActionsFilter] = useState("")

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [actionPurchaseId, setActionPurchaseId] = useState<number | null>(null)
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
  const [approvalLocations, setApprovalLocations] = useState<ApiLocation[]>([])
  const [approvalLocation, setApprovalLocation] = useState("")
  const [approvalLocationQuery, setApprovalLocationQuery] = useState("")
  const [approvalLocationLoading, setApprovalLocationLoading] = useState(false)
  const [approvalLocationError, setApprovalLocationError] = useState<string | null>(null)
  const [selectedMyAction, setSelectedMyAction] = useState<ApiMyActionItem | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const [myActions, setMyActions] = useState<ApiMyActionItem[]>([])
  const [myActionsCount, setMyActionsCount] = useState(0)
  const [myActionsPage, setMyActionsPage] = useState(1)
  const [myActionsLoading, setMyActionsLoading] = useState(true)
  const [myActionsError, setMyActionsError] = useState<string | null>(null)
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<PurchaseEditDraft | null>(null)
  const [editLocations, setEditLocations] = useState<ApiLocation[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [pathname, router, sessionStatus, token])

  const canCallApi = Boolean(apiBaseUrl && token)

  const pendingTotalPages = Math.max(1, Math.ceil(pendingCount / PURCHASE_PAGE_SIZE))
  const myRequestsTotalPages = Math.max(1, Math.ceil(myRequestsCount / PURCHASE_PAGE_SIZE))
  const myActionsTotalPages = Math.max(1, Math.ceil(myActionsCount / PURCHASE_PAGE_SIZE))

  const applyPendingFilter = useCallback(() => {
    setPendingPage(1)
    setPendingFilter(pendingFilterInput.trim())
  }, [pendingFilterInput])

  const loadPendingPage = useCallback(
    async (pageNumber: number) => {
      if (!canCallApi) return
      try {
        setPendingLoading(true)
        setPendingError(null)
        const data = await apiListPendingApprovalsPage(apiBaseUrl, token as string, {
          page: pageNumber,
          page_size: PURCHASE_PAGE_SIZE,
          search: pendingFilter,
        })
        setPending(data.results)
        setPendingCount(data.count)
      } catch (e) {
        setPendingError(getErrorMessage(e, "Failed to load pending approvals"))
      } finally {
        setPendingLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, pendingFilter, token]
  )

  const loadMyPurchasesPage = useCallback(
    async (pageNumber: number) => {
      if (!canCallApi) return
      try {
        setMyRequestsLoading(true)
        setMyRequestsError(null)
        const data = await apiListMyPurchasesPage(apiBaseUrl, token as string, {
          page: pageNumber,
          page_size: PURCHASE_PAGE_SIZE,
          search: requestFilter,
        })
        setMyRequests(data.results)
        setMyRequestsCount(data.count)
      } catch (e) {
        setMyRequestsError(getErrorMessage(e, "Failed to load your requests"))
      } finally {
        setMyRequestsLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, requestFilter, token]
  )

  const loadMyActionsPage = useCallback(
    async (pageNumber: number) => {
      if (!canCallApi) return
      try {
        setMyActionsLoading(true)
        setMyActionsError(null)
        const data = await apiListMyActionsPage(apiBaseUrl, token as string, {
          page: pageNumber,
          page_size: PURCHASE_PAGE_SIZE,
          search: myActionsFilter,
        })
        setMyActions(data.results)
        setMyActionsCount(data.count)
      } catch (e) {
        setMyActionsError(getErrorMessage(e, "Failed to load your actions"))
      } finally {
        setMyActionsLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, myActionsFilter, token]
  )

  const loadSalesPending = useCallback(async () => {
    if (!canCallApi) return
    try {
      setSalesPendingLoading(true)
      setSalesPendingError(null)
      const data = await apiListPendingSalesApprovals(apiBaseUrl, token as string)
      setSalesPending(data)
      setSalesPendingLoaded(true)
    } catch (e) {
      setSalesPendingError(getErrorMessage(e, "Failed to load pending sales approvals"))
    } finally {
      setSalesPendingLoading(false)
    }
  }, [apiBaseUrl, canCallApi, token])

  useEffect(() => {
    if (!canCallApi) return
    let cancelled = false

    async function run() {
      try {
        setPendingLoading(true)
        setPendingError(null)
        const data = await apiListPendingApprovalsPage(apiBaseUrl, token as string, {
          page: pendingPage,
          page_size: PURCHASE_PAGE_SIZE,
          search: pendingFilter,
        })
        if (cancelled) return
        setPending(data.results)
        setPendingCount(data.count)
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
  }, [apiBaseUrl, canCallApi, pendingFilter, pendingPage, token])

  useEffect(() => {
    setPendingApprovalCount(pendingCount + salesPending.length)
  }, [pendingCount, salesPending.length, setPendingApprovalCount])

  useEffect(() => {
    if (!canCallApi) return
    if (activeTab !== "sales-pending") return
    if (salesPendingLoaded) return
    void loadSalesPending()
  }, [activeTab, canCallApi, loadSalesPending, salesPendingLoaded])

  useEffect(() => {
    if (!canCallApi) return
    if (activeTab !== "purchase-my") return
    let cancelled = false

    async function run() {
      try {
        setMyRequestsLoading(true)
        setMyRequestsError(null)
        const data = await apiListMyPurchasesPage(apiBaseUrl, token as string, {
          page: myRequestsPage,
          page_size: PURCHASE_PAGE_SIZE,
          search: requestFilter,
        })
        if (cancelled) return
        setMyRequests(data.results)
        setMyRequestsCount(data.count)
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
  }, [activeTab, apiBaseUrl, canCallApi, myRequestsPage, requestFilter, token])

  useEffect(() => {
    if (!canCallApi) return
    if (activeTab !== "my-actions") return
    let cancelled = false

    async function run() {
      try {
        setMyActionsLoading(true)
        setMyActionsError(null)
        const data = await apiListMyActionsPage(apiBaseUrl, token as string, {
          page: myActionsPage,
          page_size: PURCHASE_PAGE_SIZE,
          search: myActionsFilter,
        })
        if (cancelled) return
        setMyActions(data.results)
        setMyActionsCount(data.count)
      } catch (e) {
        if (cancelled) return
        setMyActionsError(getErrorMessage(e, "Failed to load your actions"))
      } finally {
        if (!cancelled) setMyActionsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [activeTab, apiBaseUrl, canCallApi, myActionsFilter, myActionsPage, token])

  useEffect(() => {
    if (pendingPage > pendingTotalPages) setPendingPage(pendingTotalPages)
  }, [pendingPage, pendingTotalPages])

  useEffect(() => {
    if (myRequestsPage > myRequestsTotalPages) setMyRequestsPage(myRequestsTotalPages)
  }, [myRequestsPage, myRequestsTotalPages])

  useEffect(() => {
    if (myActionsPage > myActionsTotalPages) setMyActionsPage(myActionsTotalPages)
  }, [myActionsPage, myActionsTotalPages])

  useEffect(() => {
    if (!canCallApi || !approveOpen) return
    const currentPending = pending.find((p) => p.id === actionPurchaseId)
    if (!currentPending || currentPending.current_step !== 2) {
      setApprovalLocations([])
      setApprovalLocation("")
      setApprovalLocationQuery("")
      setApprovalLocationLoading(false)
      setApprovalLocationError(null)
      return
    }

    let cancelled = false
    setApprovalLocation(currentPending.location)
    setApprovalLocationQuery("")
    setApprovalLocationError(null)

    async function run() {
      try {
        setApprovalLocationLoading(true)
        const locations = await apiListLocations(apiBaseUrl, token as string)
        if (cancelled) return
        setApprovalLocations(locations)
      } catch (e) {
        if (cancelled) return
        setApprovalLocationError(getErrorMessage(e, "Failed to load locations"))
      } finally {
        setApprovalLocationLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [actionPurchaseId, apiBaseUrl, approveOpen, canCallApi, pending, token])

  useEffect(() => {
    if (!canCallApi || !approveOpen) return
    const currentPending = pending.find((p) => p.id === actionPurchaseId)
    if (!currentPending || currentPending.current_step !== 2) return

    let cancelled = false
    const t = setTimeout(() => {
      setApprovalLocationLoading(true)
      setApprovalLocationError(null)
      apiListLocations(apiBaseUrl, token as string, approvalLocationQuery)
        .then((locations) => {
          if (cancelled) return
          setApprovalLocations(locations)
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setApprovalLocationError(getErrorMessage(e, "Failed to load locations"))
        })
        .finally(() => {
          if (cancelled) return
          setApprovalLocationLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [actionPurchaseId, apiBaseUrl, approvalLocationQuery, approveOpen, canCallApi, pending, token])

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

  const startEditPurchase = useCallback(
    async (purchaseId: number) => {
      if (!canCallApi) return
      try {
        setEditLoading(true)
        setEditError(null)
        setEditSuccess(null)
        const tokenStr = token as string
        const [purchaseDetail, locations] = await Promise.all([
          apiGetPurchaseDetail(apiBaseUrl, tokenStr, purchaseId),
          apiListLocations(apiBaseUrl, tokenStr),
        ])
        setEditingPurchaseId(purchaseId)
        setEditLocations(locations)
        setEditDraft({
          name: purchaseDetail.name,
          part_number: purchaseDetail.part_number,
          quantity: String(purchaseDetail.quantity),
          price: purchaseDetail.price == null ? "" : String(purchaseDetail.price),
          location: String(purchaseDetail.location),
          brand: purchaseDetail.brand ?? "",
          is_caterpillar: purchaseDetail.is_caterpillar ?? true,
          is_original: purchaseDetail.is_original ?? true,
          is_new_product: purchaseDetail.is_new_product,
        })
      } catch (e) {
        setEditError(getErrorMessage(e, "Failed to load purchase for editing"))
        setEditingPurchaseId(null)
        setEditDraft(null)
      } finally {
        setEditLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, token]
  )

  const resetEditState = useCallback(() => {
    setEditingPurchaseId(null)
    setEditDraft(null)
    setEditError(null)
    setEditSuccess(null)
  }, [])

  const handleApprove = async () => {
    if (!actionPurchaseId || !canCallApi) return
    setActionLoading(true)
    setActionError(null)
    try {
      const tokenStr = token as string
      const currentPending = pending.find((p) => p.id === actionPurchaseId)
      const approvePayload: { reason?: string; location?: string } = {}

      if (approveReason.trim()) {
        approvePayload.reason = approveReason.trim()
      }
      if (currentPending?.current_step === 2 && approvalLocation && approvalLocation !== currentPending.location) {
        approvePayload.location = approvalLocation
      }

      await apiApprovePurchase(apiBaseUrl, tokenStr, actionPurchaseId, approvePayload)
      setApproveOpen(false)
      setActionPurchaseId(null)
      setApproveReason("")
      setApprovalLocation("")
      setApprovalLocationError(null)
      await loadPendingPage(pendingPage)
      if (selectedId === actionPurchaseId) {
        await loadDetail(actionPurchaseId)
      }
      await loadMyPurchasesPage(myRequestsPage)
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
      setSalesPendingLoaded(true)
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
      setSalesPendingLoaded(true)
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
    if (!actionPurchaseId || !canCallApi) return
    if (!rejectReason.trim()) {
      setActionError("Rejection reason is required")
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      const tokenStr = token as string
      await apiRejectPurchase(apiBaseUrl, tokenStr, actionPurchaseId, rejectReason.trim())
      setRejectOpen(false)
      setActionPurchaseId(null)
      setRejectReason("")
      await loadPendingPage(pendingPage)
      if (selectedId === actionPurchaseId) {
        await loadDetail(actionPurchaseId)
      }
      await loadMyPurchasesPage(myRequestsPage)
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to reject"))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeMyAction = async () => {
    if (!selectedMyAction || !canCallApi) return
    setRevokeLoading(true)
    setRevokeError(null)
    try {
      const tokenStr = token as string
      await apiRevokeMyAction(apiBaseUrl, tokenStr, {
        type: selectedMyAction.type,
        approval_id: selectedMyAction.approval_id,
      })
      setRevokeOpen(false)
      setSelectedMyAction(null)
      await loadMyActionsPage(myActionsPage)
      await loadPendingPage(pendingPage)
      if (selectedMyAction.type === "sale" || salesPendingLoaded) {
        const salesPendingUpdated = await apiListPendingSalesApprovals(apiBaseUrl, tokenStr)
        setSalesPending(salesPendingUpdated)
        setSalesPendingLoaded(true)
      }
    } catch (e) {
      setRevokeError(getErrorMessage(e, "Failed to change decision"))
    } finally {
      setRevokeLoading(false)
    }
  }

  const handleSavePurchaseEdit = async () => {
    if (!editingPurchaseId || !editDraft || !canCallApi) return

    const quantity = Number.parseInt(editDraft.quantity, 10)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setEditError("Quantity must be greater than 0")
      return
    }

    const trimmedPrice = editDraft.price.trim()
    const price = trimmedPrice === "" ? null : Number.parseInt(trimmedPrice, 10)
    if (trimmedPrice !== "" && (price == null || !Number.isFinite(price) || price < 0)) {
      setEditError("Price cannot be negative")
      return
    }

    if (!editDraft.location) {
      setEditError("Location is required")
      return
    }

    setEditSaving(true)
    setEditError(null)
    setEditSuccess(null)

    try {
      const tokenStr = token as string
      const updated = await apiUpdatePurchase(apiBaseUrl, tokenStr, editingPurchaseId, {
        name: editDraft.name.trim(),
        part_number: editDraft.part_number.trim(),
        quantity,
        price,
        location: editDraft.location,
        brand: editDraft.is_new_product ? (editDraft.brand.trim() || null) : null,
        is_caterpillar: editDraft.is_caterpillar,
        is_original: editDraft.is_original,
      })

      await loadMyPurchasesPage(myRequestsPage)
      setEditDraft({
        name: updated.name,
        part_number: updated.part_number,
        quantity: String(updated.quantity),
        price: updated.price == null ? "" : String(updated.price),
        location: String(updated.location),
        brand: updated.brand ?? "",
        is_caterpillar: updated.is_caterpillar ?? true,
        is_original: updated.is_original ?? true,
        is_new_product: updated.is_new_product,
      })
      setEditSuccess("Purchase updated successfully.")

      if (selectedId === editingPurchaseId) {
        setDetail(updated)
      }
    } catch (e) {
      setEditError(getErrorMessage(e, "Failed to update purchase"))
    } finally {
      setEditSaving(false)
    }
  }

  const filteredMyRequests = myRequests

  const filteredSalesMy = salesMy.filter(
    (s) =>
      !salesFilter ||
      s.part_name.toLowerCase().includes(salesFilter.toLowerCase()) ||
      s.part_number.toLowerCase().includes(salesFilter.toLowerCase()) ||
      s.status.toLowerCase().includes(salesFilter.toLowerCase())
  )

  const selectedPending = pending.find((p) => p.id === actionPurchaseId)
  const selectedSalesPending = salesPending.find((s) => s.id === selectedSalesId)

  const purchasePendingCount = pendingCount
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
        <button
          onClick={() => setActiveTab("my-actions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "my-actions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Actions
        </button>
      </div>

      {activeTab === "purchase-pending" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Purchase Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Input
                placeholder="Search approvals..."
                value={pendingFilterInput}
                onChange={(e) => setPendingFilterInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applyPendingFilter()
                  }
                }}
                className="w-full sm:max-w-xs"
              />
            </div>
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
              <div className="space-y-4">
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
                                setActionPurchaseId(p.id)
                                setApproveOpen(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setActionPurchaseId(p.id)
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

                <PaginationControls
                  currentPage={pendingPage}
                  totalPages={pendingTotalPages}
                  visibleCount={pending.length}
                  totalCount={pendingCount}
                  onPageChange={setPendingPage}
                />
              </div>
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
                onChange={(e) => {
                  setRequestFilter(e.target.value)
                  setMyRequestsPage(1)
                }}
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
              <div className="space-y-6">
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
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => loadDetail(p.id)}>
                              <Eye className="h-4 w-4" />
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canEditPurchase(p) || editLoading || editSaving}
                              onClick={() => startEditPurchase(p.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <PaginationControls
                  currentPage={myRequestsPage}
                  totalPages={myRequestsTotalPages}
                  visibleCount={myRequests.length}
                  totalCount={myRequestsCount}
                  onPageChange={setMyRequestsPage}
                />

                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Edit Purchase</h3>
                      <p className="text-sm text-muted-foreground">
                        Changes are allowed only before the first approval is confirmed.
                      </p>
                    </div>
                    {editingPurchaseId && (
                      <Badge variant="outline">Purchase #{editingPurchaseId}</Badge>
                    )}
                  </div>

                  {editLoading && (
                    <p className="mt-4 text-sm text-muted-foreground">Loading purchase details...</p>
                  )}

                  {!editLoading && !editDraft && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Select a purchase with the edit button to update it.
                    </p>
                  )}

                  {editDraft && (
                    <div className="mt-4 space-y-4">
                      {editError && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {editError}
                        </div>
                      )}
                      {editSuccess && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                          {editSuccess}
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                            placeholder="Purchase name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Part Number</label>
                          <Input
                            value={editDraft.part_number}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, part_number: e.target.value } : prev))}
                            placeholder="Part number"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            value={editDraft.quantity}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, quantity: e.target.value } : prev))}
                            placeholder="Quantity"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Price</label>
                          <Input
                            type="number"
                            min="0"
                            value={editDraft.price}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                            placeholder="Price"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-sm font-medium">Location</label>
                          <Select
                            value={editDraft.location}
                            onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, location: value } : prev))}
                            options={[
                              { value: "", label: "Select location" },
                              ...editLocations.map((location) => ({
                                value: String(location.id),
                                label: location.location,
                              })),
                            ]}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Brand</label>
                          <Input
                            value={editDraft.brand}
                            disabled={!editDraft.is_new_product}
                            onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, brand: e.target.value } : prev))}
                            placeholder="Brand"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Caterpillar</label>
                          <Select
                            value={editDraft.is_caterpillar ? "true" : "false"}
                            onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, is_caterpillar: value === "true" } : prev))}
                            disabled={!editDraft.is_new_product}
                            options={[
                              { value: "true", label: "Caterpillar" },
                              { value: "false", label: "Other" },
                            ]}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Original</label>
                          <Select
                            value={editDraft.is_original ? "true" : "false"}
                            onChange={(value) => setEditDraft((prev) => (prev ? { ...prev, is_original: value === "true" } : prev))}
                            disabled={!editDraft.is_new_product}
                            options={[
                              { value: "true", label: "Original" },
                              { value: "false", label: "CHINA" },
                            ]}
                          />
                        </div>
                      </div>

                      {!editDraft.is_new_product && (
                        <p className="text-sm text-muted-foreground">
                          Brand and quality fields are inherited from the selected stock for existing products.
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={handleSavePurchaseEdit} disabled={editSaving}>
                          {editSaving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="outline" onClick={resetEditState} disabled={editSaving}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "my-actions" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">My Actions</CardTitle>
              <Input
                placeholder="Search actions..."
                value={myActionsFilter}
                onChange={(e) => {
                  setMyActionsFilter(e.target.value)
                  setMyActionsPage(1)
                }}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {myActionsLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
            )}
            {myActionsError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {myActionsError}
              </div>
            )}
            {!myActionsLoading && !myActionsError && myActions.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No actions yet.</p>
            )}
            {!myActionsLoading && !myActionsError && myActions.length > 0 && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myActions.map((a) => (
                      <TableRow key={`${a.type}-${a.approval_id}`}>
                        <TableCell className="capitalize">{a.type}</TableCell>
                        <TableCell className="font-mono text-xs">{String(a.object_id)}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell className="font-mono text-xs">{a.part_number}</TableCell>
                        <TableCell>{a.quantity}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              a.decision === "approved"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {a.decision}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.step}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor(a.current_status)}>
                            {a.current_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.acted_at ? new Date(a.acted_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {a.type === "purchase" && (
                              <Button size="sm" variant="ghost" onClick={() => loadDetail(a.object_id as number)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {a.type === "sale" && (
                              <Button size="sm" variant="ghost" onClick={() => loadSalesDetail(a.object_id as string)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!a.can_change_decision}
                              title={a.can_change_decision ? "" : a.blocked_reason ?? "Not allowed"}
                              onClick={() => {
                                setSelectedMyAction(a)
                                setRevokeError(null)
                                setRevokeOpen(true)
                              }}
                            >
                              Change decision
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <PaginationControls
                  currentPage={myActionsPage}
                  totalPages={myActionsTotalPages}
                  visibleCount={myActions.length}
                  totalCount={myActionsCount}
                  onPageChange={setMyActionsPage}
                />
              </div>
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
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Purchase Summary</p>
                    <h3 className="text-lg font-semibold leading-tight text-foreground">{detail.name}</h3>
                    <p className="font-mono text-sm text-muted-foreground">{detail.part_number}</p>
                  </div>
                  <Badge variant="outline" className={statusColor(detail.status)}>
                    <span className="flex items-center gap-1">
                      {statusIcon(detail.status)}
                      {detail.status}
                    </span>
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{detail.quantity}</p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{detail.total_amount}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{detail.is_new_product ? "New Product" : "Existing Product"}</Badge>
                  <Badge variant="outline">{(detail.is_caterpillar ?? true) ? "Caterpillar" : "Other"}</Badge>
                  <Badge
                    variant="outline"
                    className={!(detail.is_original ?? true) ? "border-red-300 text-red-700" : undefined}
                  >
                    {(detail.is_original ?? true) ? "Original" : "CHINA"}
                  </Badge>
                  {detail.brand?.trim() && <Badge variant="outline">{detail.brand}</Badge>}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Details</h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Brand</p>
                    <p className="mt-1 font-medium">{detail.brand?.trim() ? detail.brand : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="mt-1 font-medium">{detail.location_details?.location ?? detail.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Requested By</p>
                    <p className="mt-1 font-medium">{detail.created_by_details.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{detail.created_by_details.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="mt-1 font-medium">{new Date(detail.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="mt-1 font-medium">{new Date(detail.updated_at).toLocaleString()}</p>
                  </div>
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
                        setActionPurchaseId(selectedId)
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
                        setActionPurchaseId(selectedId)
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

      <Dialog
        open={revokeOpen}
        onOpenChange={(open) => {
          setRevokeOpen(open)
          if (!open) {
            setSelectedMyAction(null)
            setRevokeError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMyAction?.decision === "approved" ? "Revoke Approval" : "Revoke Rejection"}
            </DialogTitle>
            <DialogDescription>
              This will revert your decision only if the workflow has not moved past your step. Final approvals cannot be revoked.
              {selectedMyAction && (
                <span className="block mt-1">
                  <strong>{selectedMyAction.name}</strong> — {selectedMyAction.part_number} — Qty: {selectedMyAction.quantity}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {revokeError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {revokeError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeOpen(false)
                setSelectedMyAction(null)
                setRevokeError(null)
              }}
              disabled={revokeLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRevokeMyAction} disabled={revokeLoading || !selectedMyAction}>
              {revokeLoading ? "Changing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approveOpen}
        onOpenChange={(open) => {
          setApproveOpen(open)
          if (!open) {
            setActionPurchaseId(null)
            setApproveReason("")
            setApprovalLocation("")
            setApprovalLocationQuery("")
            setApprovalLocations([])
            setApprovalLocationLoading(false)
            setApprovalLocationError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase Approval</DialogTitle>
            <DialogDescription>
              You are about to approve purchase request #{actionPurchaseId}. This will move the request to the next approval stage or complete the approval flow.
              {selectedPending && (
                <span className="block mt-1">
                  <strong>{selectedPending.name}</strong> — {selectedPending.part_number} — Qty: {selectedPending.quantity}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Approval Note (optional)</label>
            <Input
              placeholder="Add an approval note..."
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
            />
          </div>
          {selectedPending?.current_step === 2 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Receiving Location (temporary)</label>
              <Input
                placeholder="Search locations..."
                value={approvalLocationQuery}
                onChange={(e) => setApprovalLocationQuery(e.target.value)}
              />
              <Select
                value={approvalLocation}
                onChange={setApprovalLocation}
                disabled={approvalLocationLoading && approvalLocations.length === 0}
                options={[
                  {
                    value: approvalLocation || selectedPending.location,
                    label:
                      (approvalLocation === selectedPending.location || !approvalLocation) &&
                      selectedPending.location_details?.location
                        ? `Current: ${selectedPending.location_details.location}`
                        : approvalLocations.find((l) => String(l.id) === approvalLocation)?.location
                          ? `Selected: ${approvalLocations.find((l) => String(l.id) === approvalLocation)?.location}`
                          : "Selected location",
                  },
                  ...approvalLocations
                    .filter((location) => {
                      const id = String(location.id)
                      if (id === selectedPending.location) return false
                      if (approvalLocation && id === approvalLocation) return false
                      return true
                    })
                    .map((location) => ({
                      value: String(location.id),
                      label: location.location,
                    })),
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Temporary step-2 override. This updates the purchase location before later confirmation.
              </p>
              {approvalLocationLoading && (
                <p className="text-xs text-muted-foreground">Loading locations…</p>
              )}
              {approvalLocationError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {approvalLocationError}
                </div>
              )}
            </div>
          )}
          {actionError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveOpen(false)
                setActionPurchaseId(null)
                setApproveReason("")
                setApprovalLocation("")
                setApprovalLocationQuery("")
                setApprovalLocations([])
                setApprovalLocationLoading(false)
                setApprovalLocationError(null)
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? "Approving..." : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open)
          if (!open) {
            setActionPurchaseId(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting purchase request #{actionPurchaseId}.
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
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false)
                setActionPurchaseId(null)
                setRejectReason("")
              }}
              disabled={actionLoading}
            >
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
