"use client"

import { useEffect, useMemo, useState } from "react"
import { KeyRound, Search } from "lucide-react"

import { apiAddPermissionsToGroup, apiListPermissions, type RbacPermission } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AddPermissionsDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiBaseUrl: string
  token: string
  groupId: number
  existingPermissionIds: number[]
  onAdded: () => void
}) {
  const existing = useMemo(() => new Set(props.existingPermissionIds), [props.existingPermissionIds])
  const [q, setQ] = useState("")
  const [all, setAll] = useState<RbacPermission[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setQ("")
    setAll([])
    setSelected(new Set())
    setError(null)
    setLoading(false)
    setSaving(false)
  }, [props.open])

  useEffect(() => {
    if (!props.open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const perms = await apiListPermissions(props.apiBaseUrl, props.token)
        if (cancelled) return
        setAll(perms)
      } catch (e) {
        if (cancelled) return
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to load permissions"
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [props.apiBaseUrl, props.open, props.token])

  const availableResults = useMemo(() => {
    const term = q.trim().toLowerCase()
    const base = all.filter((p) => !existing.has(p.id))
    if (!term) return base
    return base.filter((p) => p.name.toLowerCase().includes(term))
  }, [all, existing, q])

  const selectedIds = useMemo(() => Array.from(selected.values()), [selected])
  const canAdd = selectedIds.length > 0 && !saving

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add permissions</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setError(null)
              }}
              placeholder="Search permissions by name…"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">Add</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Loading permissions…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && availableResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      No permissions found.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  availableResults.map((p) => {
                    const checked = selected.has(p.id)
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelected((prev) => {
                            const next = new Set(prev)
                            if (next.has(p.id)) next.delete(p.id)
                            else next.add(p.id)
                            return next
                          })
                        }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (next.has(p.id)) next.delete(p.id)
                                else next.add(p.id)
                                return next
                              })
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">ID {p.id}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{String(p.content_type)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={!canAdd}
            onClick={async () => {
              try {
                setSaving(true)
                setError(null)
                await apiAddPermissionsToGroup(props.apiBaseUrl, props.token, props.groupId, selectedIds)
                props.onAdded()
                props.onOpenChange(false)
              } catch (e) {
                const message =
                  typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                    ? ((e as { message?: unknown }).message as string)
                    : "Failed to add permissions"
                setError(message)
              } finally {
                setSaving(false)
              }
            }}
          >
            <KeyRound className="h-4 w-4" />
            {saving ? "Adding…" : `Add ${selectedIds.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
