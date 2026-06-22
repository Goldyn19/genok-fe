"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CheckCircle, Eye, XCircle } from "lucide-react"

import {
  apiAdminFinalApprovalsApproveBulk,
  apiApprovePurchase,
  apiGetPurchaseDetail,
  apiListAdminFinalApprovalsPage,
  getApiBaseUrl,
  type ApiAdminFinalBulkApproveResult,
  type ApiPurchaseDetail,
  type ApiPurchaseListItem,
} from "@/lib/api"
import { getErrorMessage } from "@/lib/rbacUtils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PAGE_SIZE = 10

function statusVariant(status: string): "success" | "warning" | "danger" | "outline" {
  switch (status) {
    case "confirmed":
      return "success"
    case "approved":
      return "outline"
    case "failed":
      return "danger"
    default:
      return "warning"
  }
}

function ApprovalStepRow({ step }: { step: ApiPurchaseDetail["approvals"][number] }) {
  const confirmed = step.status === "confirmed"
  const failed = step.status === "failed"

  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <div className="mt-0.5">
        {confirmed ? (
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        ) : failed ? (
          <XCircle className="h-4 w-4 text-red-600" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700">
            {step.sequence}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Step {step.sequence}</span>
          <Badge variant={statusVariant(step.status)}>{step.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">{step.required_permission}</div>
        {step.approved_by_details && (
          <div className="text-xs text-muted-foreground">
            {step.approved_by_details.full_name || step.approved_by_details.email}
          </div>
        )}
        {step.reason && <div className="text-xs italic text-foreground/80">&quot;{step.reason}&quot;</div>}
      </div>
    </div>
  )
}

export function AdminFinalPurchaseApprovalsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken
  const canCallApi = Boolean(apiBaseUrl && token)

  const [rows, setRows] = useState<ApiPurchaseListItem[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<ApiPurchaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [approveOpen, setApproveOpen] = useState(false)
  const [approveReason, setApproveReason] = useState("")
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false)
  const [bulkApproveReason, setBulkApproveReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<ApiAdminFinalBulkApproveResult | null>(null)

  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [pathname, router, sessionStatus, token])

  const loadPage = useCallback(
    async (pageNumber: number) => {
      if (!canCallApi) return
      try {
        setLoading(true)
        setError(null)
        const data = await apiListAdminFinalApprovalsPage(apiBaseUrl, token as string, {
          page: pageNumber,
          page_size: PAGE_SIZE,
          search: query,
        })
        setRows(data.results)
        setCount(data.count)
        if (selectedId != null && !data.results.some((row) => row.id === selectedId)) {
          setSelectedId(null)
          setDetail(null)
        }
      } catch (e) {
        setError(getErrorMessage(e, "Failed to load final approvals"))
        setRows([])
        setCount(0)
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, query, selectedId, token]
  )

  useEffect(() => {
    if (!canCallApi) return
    void loadPage(page)
  }, [canCallApi, loadPage, page])

  const loadDetail = useCallback(
    async (purchaseId: number) => {
      if (!canCallApi) return
      try {
        setDetailLoading(true)
        setDetailError(null)
        const data = await apiGetPurchaseDetail(apiBaseUrl, token as string, purchaseId)
        setSelectedId(purchaseId)
        setDetail(data)
      } catch (e) {
        setDetailError(getErrorMessage(e, "Failed to load purchase details"))
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, token]
  )

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allOnPageSelected = useMemo(() => rows.length > 0 && rows.every((r) => selectedIdSet.has(r.id)), [rows, selectedIdSet])
  const selectedCount = selectedIds.length

  async function handleApprove() {
    if (!selectedId || !canCallApi) return
    try {
      setActionLoading(true)
      setActionError(null)
      await apiApprovePurchase(apiBaseUrl, token as string, selectedId, {
        reason: approveReason.trim() || undefined,
      })
      setApproveOpen(false)
      setApproveReason("")
      setSelectedIds((prev) => prev.filter((id) => id !== selectedId))
      setDetail(null)
      setSelectedId(null)
      await loadPage(page)
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to approve purchase"))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBulkApprove() {
    if (!canCallApi) return
    if (selectedIds.length === 0) return
    try {
      setActionLoading(true)
      setActionError(null)
      setBulkResult(null)
      const result = await apiAdminFinalApprovalsApproveBulk(apiBaseUrl, token as string, {
        purchase_ids: selectedIds,
        reason: bulkApproveReason.trim() || undefined,
      })
      setBulkResult(result)
      setSelectedIds((prev) => prev.filter((id) => !result.approved.includes(id)))
      setBulkApproveOpen(false)
      setBulkApproveReason("")
      setDetail(null)
      setSelectedId(null)
      await loadPage(page)
    } catch (e) {
      setActionError(getErrorMessage(e, "Failed to bulk approve purchases"))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Final Purchase Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Superusers can approve any purchase currently waiting on the final approval step, including self-created requests.
        </p>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Pending Final Step</CardTitle>
                <CardDescription>Only purchases with steps 1 and 2 already confirmed appear here.</CardDescription>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Input
                  placeholder="Search final approvals..."
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1)
                      setQuery(queryInput.trim())
                    }
                  }}
                  className="sm:w-72"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(1)
                    setQuery(queryInput.trim())
                  }}
                >
                  Search
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>}
            {!loading && rows.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No final-step purchase approvals pending.</div>
            )}
            {!loading && rows.length > 0 && (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{selectedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds([])}
                      disabled={selectedCount === 0}
                    >
                      Clear selection
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => setBulkApproveOpen(true)}
                      disabled={selectedCount === 0}
                    >
                      Approve selected
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={() => {
                            setSelectedIds((prev) => {
                              const prevSet = new Set(prev)
                              const pageIds = rows.map((r) => r.id)
                              const allSelected = pageIds.length > 0 && pageIds.every((id) => prevSet.has(id))
                              if (allSelected) {
                                pageIds.forEach((id) => prevSet.delete(id))
                              } else {
                                pageIds.forEach((id) => prevSet.add(id))
                              }
                              return Array.from(prevSet)
                            })
                          }}
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedIdSet.has(row.id)}
                            onChange={() => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(row.id)) next.delete(row.id)
                                else next.add(row.id)
                                return Array.from(next)
                              })
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">#{row.id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="font-mono text-xs">{row.part_number}</TableCell>
                        <TableCell>{row.location_details?.location ?? row.location}</TableCell>
                        <TableCell>{row.created_by_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => void loadDetail(row.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => {
                                setSelectedId(row.id)
                                setApproveOpen(true)
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{rows.length}</span> of{" "}
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                      Prev
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Page <span className="font-medium text-foreground">{page}</span> of{" "}
                      <span className="font-medium text-foreground">{totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
            <CardDescription>
              {selectedRow ? `Selected purchase #${selectedRow.id}` : "Select a purchase to review its approval chain."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading && <div className="text-sm text-muted-foreground">Loading details...</div>}
            {detailError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detailError}</div>}
            {!detailLoading && !detail && !detailError && (
              <div className="text-sm text-muted-foreground">No purchase selected.</div>
            )}
            {detail && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="text-sm font-medium text-foreground">{detail.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Part Number</div>
                    <div className="text-sm font-medium text-foreground">{detail.part_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Requested By</div>
                    <div className="text-sm font-medium text-foreground">{detail.created_by_details.full_name || detail.created_by_details.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="text-sm font-medium text-foreground">{detail.location_details.location}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Quantity</div>
                    <div className="text-sm font-medium text-foreground">{detail.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Approval Chain</div>
                  <div className="space-y-2">
                    {detail.approvals.map((step) => (
                      <ApprovalStepRow key={step.id} step={step} />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => setApproveOpen(true)}
                    disabled={!detail.can_current_user_approve}
                  >
                    Final Approve
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve final step</DialogTitle>
            <DialogDescription>Confirm the final approval for this purchase request.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Purchase: <span className="font-medium text-foreground">#{selectedId ?? "—"}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Reason (optional)</div>
              <Input value={approveReason} onChange={(e) => setApproveReason(e.target.value)} placeholder="Optional approval note" />
            </div>
            {actionError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleApprove} disabled={actionLoading || !selectedId}>
              {actionLoading ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkApproveOpen} onOpenChange={setBulkApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve selected purchases</DialogTitle>
            <DialogDescription>Approves only purchases currently in the final approval step.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedCount}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Reason (optional)</div>
              <Input
                value={bulkApproveReason}
                onChange={(e) => setBulkApproveReason(e.target.value)}
                placeholder="Optional approval note"
              />
            </div>
            {actionError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkApproveOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleBulkApprove}
              disabled={actionLoading || selectedCount === 0}
            >
              {actionLoading ? "Approving..." : "Approve selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bulkResult && (
        <div className="rounded-md border bg-card p-4 text-sm">
          <div className="font-medium text-foreground">
            Bulk approval: {bulkResult.approved.length} approved, {bulkResult.failed.length} failed
          </div>
          {bulkResult.failed.length > 0 && (
            <div className="mt-2 space-y-1 text-muted-foreground">
              {bulkResult.failed.slice(0, 10).map((f) => (
                <div key={f.id}>
                  #{f.id}: {f.error}
                </div>
              ))}
              {bulkResult.failed.length > 10 && <div>...and {bulkResult.failed.length - 10} more</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
