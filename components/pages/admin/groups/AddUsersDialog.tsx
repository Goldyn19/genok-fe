"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, UserPlus } from "lucide-react"

import { apiAddUsersToGroup, apiSearchUsers, type RbacUser } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function userLabel(u: RbacUser) {
  const parts = [u.full_name, u.email].filter(Boolean)
  return parts.join(" · ")
}

export function AddUsersDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiBaseUrl: string
  token: string
  groupId: number
  existingUserIds: number[]
  onAdded: () => void
}) {
  const existing = useMemo(() => new Set(props.existingUserIds), [props.existingUserIds])
  const [q, setQ] = useState("")
  const [results, setResults] = useState<RbacUser[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setQ("")
    setResults([])
    setSelected(new Set())
    setError(null)
    setLoading(false)
    setSaving(false)
  }, [props.open])

  useEffect(() => {
    if (!props.open) return
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        const users = await apiSearchUsers(props.apiBaseUrl, props.token, term)
        if (cancelled) return
        setResults(users)
      } catch (e) {
        if (cancelled) return
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to search users"
        setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, props.apiBaseUrl, props.open, props.token])

  const availableResults = useMemo(() => results.filter((u) => !existing.has(u.id)), [results, existing])

  const selectedIds = useMemo(() => Array.from(selected.values()), [selected])
  const canAdd = selectedIds.length > 0 && !saving

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add users</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setError(null)
              }}
              placeholder="Search users by username, email, or name…"
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">Add</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Searching…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && q.trim().length < 2 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Type at least 2 characters to search.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && q.trim().length >= 2 && availableResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  availableResults.map((u) => {
                    const checked = selected.has(u.id)
                    return (
                      <TableRow key={u.id} className="cursor-pointer" onClick={() => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(u.id)) next.delete(u.id)
                          else next.add(u.id)
                          return next
                        })
                      }}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelected((prev) => {
                                const next = new Set(prev)
                                if (next.has(u.id)) next.delete(u.id)
                                else next.add(u.id)
                                return next
                              })
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{u.username}</div>
                          <div className="text-xs text-muted-foreground">{userLabel(u)}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.is_active ? "Active" : "Inactive"}</TableCell>
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
                await apiAddUsersToGroup(props.apiBaseUrl, props.token, props.groupId, selectedIds)
                props.onAdded()
                props.onOpenChange(false)
              } catch (e) {
                const message =
                  typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                    ? ((e as { message?: unknown }).message as string)
                    : "Failed to add users"
                setError(message)
              } finally {
                setSaving(false)
              }
            }}
          >
            <UserPlus className="h-4 w-4" />
            {saving ? "Adding…" : `Add ${selectedIds.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

