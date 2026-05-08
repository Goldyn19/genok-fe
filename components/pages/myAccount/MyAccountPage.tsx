"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { apiGetMyPermissions, apiGetMyRoles, getApiBaseUrl, type MyPermissionsResponse, type MyRolesResponse } from "@/lib/api"

const EMPTY_STRING_ARRAY: string[] = []
const EMPTY_ASSIGNMENTS: MyRolesResponse["assignments"] = []
const EMPTY_ROLES: MyRolesResponse["roles"] = []

function getErrorMessage(err: unknown) {
  if (typeof err === "object" && err != null && "message" in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
    return String(message)
  }

  return "Failed to load account"
}

export function MyAccountPage() {
  const router = useRouter()
  const pathname = usePathname()

  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const [rolesRes, setRolesRes] = useState<MyRolesResponse | null>(null)
  const [permsRes, setPermsRes] = useState<MyPermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [permQuery, setPermQuery] = useState("")

  useEffect(() => {
    if (sessionStatus === "loading") return

    const tokenStr = token
    if (!tokenStr) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (!apiBaseUrl) {
      setLoading(false)
      setError("Set NEXT_PUBLIC_API_URL to load account data.")
      return
    }

    let cancelled = false

    async function run(tokenValue: string) {
      try {
        setLoading(true)
        setError(null)
        const [roles, perms] = await Promise.all([
          apiGetMyRoles(apiBaseUrl, tokenValue),
          apiGetMyPermissions(apiBaseUrl, tokenValue),
        ])

        if (cancelled) return
        setRolesRes(roles)
        setPermsRes(perms)
      } catch (e) {
        if (cancelled) return
        setError(getErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run(tokenStr)
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, pathname, router, token, sessionStatus])

  const roles = rolesRes?.roles ?? EMPTY_ROLES
  const assignments = rolesRes?.assignments ?? EMPTY_ASSIGNMENTS
  const permissions = permsRes?.permissions ?? EMPTY_STRING_ARRAY

  const filteredPermissions = useMemo(() => {
    const q = permQuery.trim().toLowerCase()
    if (!q) return permissions
    return permissions.filter((p) => p.toLowerCase().includes(q))
  }, [permissions, permQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Account</h1>
          <p className="text-sm text-muted-foreground">Your assigned roles and effective permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{loading ? "—" : roles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{loading ? "—" : assignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{loading ? "—" : permissions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!loading && roles.length === 0 && <div className="text-sm text-muted-foreground">No roles assigned.</div>}
            {!loading && roles.length > 0 && (
              <div className="space-y-2">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                      <div className="text-xs text-muted-foreground">Group: {r.group_name || "—"}</div>
                    </div>
                    <Badge variant={r.is_location_based ? "secondary" : "outline"}>{r.is_location_based ? "Location-based" : "Global"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      No active assignments.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  assignments.map((a) => (
                    <TableRow key={a.assignment_id}>
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{a.role.name}</div>
                        <div className="text-xs text-muted-foreground">#{a.assignment_id}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.location?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{String(a.assigned_at ?? "—")}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={permQuery} onChange={(e) => setPermQuery(e.target.value)} placeholder="Filter permissions (e.g. roles.view_role)" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
                </TableRow>
              )}
              {!loading && filteredPermissions.length === 0 && (
                <TableRow>
                  <TableCell className="py-10 text-center text-sm text-muted-foreground">No permissions found.</TableCell>
                </TableRow>
              )}
              {!loading &&
                filteredPermissions.map((p) => (
                  <TableRow key={p}>
                    <TableCell className="font-mono text-xs">{p}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
