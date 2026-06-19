"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

import {
  apiGetGroup,
  apiGetGroupPermissions,
  apiListGroups,
  apiCreateRoleAssignment,
  apiDeactivateRoleAssignment,
  apiGetRole,
  apiListLocations,
  apiListRoleAssignments,
  apiListRoles,
  apiSearchUsers,
  apiRemovePermissionsFromGroup,
  getApiBaseUrl,
  type ApiLocation,
  type RbacGroup,
  type RbacPermission,
  type RbacRole,
  type RbacRoleAssignment,
  type RbacRoleDetail,
  type RbacUser,
} from "@/lib/api"
import { getErrorMessage, parsePositiveInt } from "@/lib/rbacUtils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateGroupDialog } from "@/components/pages/admin/groups/CreateGroupDialog"
import { AddPermissionsDialog } from "@/components/pages/admin/groups/AddPermissionsDialog"
import { GroupListCard } from "@/components/pages/admin/groups/GroupListCard"
import { GroupDetailsCard } from "@/components/pages/admin/groups/GroupDetailsCard"
import { CreateRoleDialog } from "@/components/pages/admin/groups/CreateRoleDialog"

export function GroupsPermissionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { data: session, status: sessionStatus } = useSession()

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  const selectedGroupId = parsePositiveInt(searchParams.get("groupId"))

  const [groups, setGroups] = useState<RbacGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [groupQuery, setGroupQuery] = useState("")

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [group, setGroup] = useState<RbacGroup | null>(null)
  const [groupPermissions, setGroupPermissions] = useState<RbacPermission[]>([])

  const [addPermissionsOpen, setAddPermissionsOpen] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
  }, [pathname, router, sessionStatus, token])

  const canCallApi = Boolean(apiBaseUrl && token)

  useEffect(() => {
    if (!canCallApi) return
    let cancelled = false

    async function run() {
      try {
        setGroupsLoading(true)
        setGroupsError(null)
        const data = await apiListGroups(apiBaseUrl, token as string)
        if (cancelled) return
        setGroups(data)
      } catch (e) {
        if (cancelled) return
        setGroupsError(getErrorMessage(e, "Failed to load groups"))
      } finally {
        if (!cancelled) setGroupsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, canCallApi, token])

  useEffect(() => {
    if (!groupsLoading && !selectedGroupId && groups.length > 0) {
      router.replace(`/admin/groups?groupId=${encodeURIComponent(String(groups[0].id))}`)
    }
  }, [groups, groupsLoading, router, selectedGroupId])

  const reloadSelected = useCallback(
    async (nextGroupId: number) => {
      if (!canCallApi) return
      try {
        setDetailsLoading(true)
        setDetailsError(null)
        const [g, perms] = await Promise.all([
          apiGetGroup(apiBaseUrl, token as string, nextGroupId),
          apiGetGroupPermissions(apiBaseUrl, token as string, nextGroupId),
        ])
        setGroup(g)
        setGroupPermissions(perms)
      } catch (e) {
        setDetailsError(getErrorMessage(e, "Failed to load group details"))
        setGroup(null)
        setGroupPermissions([])
      } finally {
        setDetailsLoading(false)
      }
    },
    [apiBaseUrl, canCallApi, token]
  )

  useEffect(() => {
    if (!selectedGroupId) return
    reloadSelected(selectedGroupId)
  }, [reloadSelected, selectedGroupId])

  const filteredGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.name.toLowerCase().includes(q))
  }, [groupQuery, groups])

  const existingPermissionIds = useMemo(() => groupPermissions.map((p) => p.id), [groupPermissions])

  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.name ?? ""

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Groups &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground">Create groups, manage memberships, and assign permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          {apiBaseUrl && token && (
            <CreateGroupDialog
              apiBaseUrl={apiBaseUrl}
              token={token}
              onCreated={(g) => {
                setGroups((prev) => [g, ...prev])
                router.replace(`/admin/groups?groupId=${encodeURIComponent(String(g.id))}`)
              }}
            />
          )}
        </div>
      </div>

      {!apiBaseUrl && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Set NEXT_PUBLIC_API_URL to load RBAC data.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <GroupListCard
          groups={filteredGroups}
          loading={groupsLoading}
          error={groupsError}
          query={groupQuery}
          onQueryChange={setGroupQuery}
          selectedGroupId={selectedGroupId}
          onSelect={(groupId) => router.replace(`/admin/groups?groupId=${encodeURIComponent(String(groupId))}`)}
        />

        <GroupDetailsCard
          selectedGroupId={selectedGroupId}
          selectedGroupName={selectedGroupName}
          group={group}
          groupPermissions={groupPermissions}
          loading={detailsLoading}
          error={detailsError}
          onRefresh={() => selectedGroupId && reloadSelected(selectedGroupId)}
          onOpenAddPermissions={() => setAddPermissionsOpen(true)}
          onRemovePermission={async (permissionId) => {
            if (!selectedGroupId) return
            try {
              await apiRemovePermissionsFromGroup(apiBaseUrl, token as string, selectedGroupId, [permissionId])
              setGroupPermissions((prev) => prev.filter((x) => x.id !== permissionId))
              setGroups((prev) => prev.map((g) => (g.id === selectedGroupId ? { ...g, permissions: g.permissions.filter((x) => x.id !== permissionId) } : g)))
              setGroup((prev) => (prev ? { ...prev, permissions: prev.permissions.filter((x) => x.id !== permissionId) } : prev))
            } catch (e) {
              setDetailsError(getErrorMessage(e, "Failed to remove permission"))
            }
          }}
        />
      </div>

      {apiBaseUrl && token && <RoleAssignmentsCard apiBaseUrl={apiBaseUrl} token={token} />}

      {selectedGroupId && token && apiBaseUrl && (
        <>
          <AddPermissionsDialog
            open={addPermissionsOpen}
            onOpenChange={setAddPermissionsOpen}
            apiBaseUrl={apiBaseUrl}
            token={token}
            groupId={selectedGroupId}
            existingPermissionIds={existingPermissionIds}
            onAdded={async () => {
              await reloadSelected(selectedGroupId)
              const list = await apiListGroups(apiBaseUrl, token)
              setGroups(list)
            }}
          />
        </>
      )}
    </div>
  )
}

function flattenLocations(nodes: ApiLocation[]): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = []
  const walk = (n: ApiLocation, prefix: string) => {
    const name = prefix ? `${prefix} / ${n.location}` : n.location
    out.push({ id: n.id, name })
    for (const c of n.children ?? []) walk(c, name)
  }
  for (const n of nodes) walk(n, "")
  return out
}

function RoleAssignmentsCard(props: { apiBaseUrl: string; token: string }) {
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [roleDetails, setRoleDetails] = useState<RbacRoleDetail | null>(null)
  const [roleDetailsLoading, setRoleDetailsLoading] = useState(false)
  const [roleDetailsError, setRoleDetailsError] = useState<string | null>(null)
  const [inactiveAssignments, setInactiveAssignments] = useState<Array<RbacRoleAssignment>>([])
  const [inactiveAssignmentsLoading, setInactiveAssignmentsLoading] = useState(false)

  const [locations, setLocations] = useState<ApiLocation[]>([])
  const [locationsError, setLocationsError] = useState<string | null>(null)

  const [assignOpen, setAssignOpen] = useState(false)
  const [userQuery, setUserQuery] = useState("")
  const [userResults, setUserResults] = useState<RbacUser[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [reason, setReason] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const flatLocations = useMemo(() => flattenLocations(locations), [locations])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setRolesLoading(true)
        setRolesError(null)
        setLocationsError(null)
        const [r, locs] = await Promise.all([apiListRoles(props.apiBaseUrl, props.token), apiListLocations(props.apiBaseUrl, props.token)])
        if (cancelled) return
        setRoles(r)
        setLocations(locs)
        if (r.length > 0) setSelectedRoleId((prev) => prev ?? r[0].id)
      } catch (e) {
        if (cancelled) return
        setRolesError(getErrorMessage(e, "Failed to load roles"))
        setLocationsError(getErrorMessage(e, "Failed to load locations"))
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [props.apiBaseUrl, props.token])

  const reloadRoleDetails = useCallback(
    async (roleId: number) => {
      try {
        setRoleDetailsLoading(true)
        setRoleDetailsError(null)
        setInactiveAssignmentsLoading(true)
        const [d, inactive] = await Promise.all([
          apiGetRole(props.apiBaseUrl, props.token, roleId),
          apiListRoleAssignments(props.apiBaseUrl, props.token, { roleId, isActive: false }),
        ])
        setRoleDetails(d)
        setInactiveAssignments(inactive)
      } catch (e) {
        setRoleDetailsError(getErrorMessage(e, "Failed to load role details"))
        setRoleDetails(null)
        setInactiveAssignments([])
      } finally {
        setRoleDetailsLoading(false)
        setInactiveAssignmentsLoading(false)
      }
    },
    [props.apiBaseUrl, props.token]
  )

  useEffect(() => {
    if (selectedRoleId == null) return
    reloadRoleDetails(selectedRoleId)
  }, [reloadRoleDetails, selectedRoleId])

  useEffect(() => {
    if (!assignOpen) {
      setUserQuery("")
      setUserResults([])
      setUserLoading(false)
      setSelectedUserId(null)
      setSelectedLocationId("")
      setReason("")
      setActionError(null)
    }
  }, [assignOpen])

  useEffect(() => {
    if (!assignOpen) return
    const q = userQuery.trim()
    if (q.length < 2) {
      setUserResults([])
      return
    }

    let cancelled = false
    const t = setTimeout(() => {
      ;(async () => {
        try {
          setUserLoading(true)
          const data = await apiSearchUsers(props.apiBaseUrl, props.token, q)
          if (cancelled) return
          setUserResults(data)
        } catch (e) {
          if (cancelled) return
          setUserResults([])
          setActionError(getErrorMessage(e, "Failed to search users"))
        } finally {
          if (!cancelled) setUserLoading(false)
        }
      })()
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [assignOpen, props.apiBaseUrl, props.token, userQuery])

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null
  const isLocationBased = Boolean(roleDetails?.is_location_based ?? selectedRole?.is_location_based)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Role Assignments (Location-based)</CardTitle>
        <CardDescription>Assign users to roles (including location-based roles like floor managers).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[260px]">
            <Select
              value={selectedRoleId == null ? "" : String(selectedRoleId)}
              onChange={(v) => setSelectedRoleId(parsePositiveInt(v))}
              disabled={rolesLoading || roles.length === 0}
              options={[
                { value: "", label: rolesLoading ? "Loading roles..." : "Select role" },
                ...roles.map((r) => ({ value: String(r.id), label: r.name })),
              ]}
            />
          </div>
          <CreateRoleDialog
            apiBaseUrl={props.apiBaseUrl}
            token={props.token}
            locationOptions={flatLocations.map((l) => ({ value: l.id, label: l.name }))}
            onCreated={(role) => {
              setRoles((prev) => {
                const next = [role, ...prev.filter((r) => r.id !== role.id)]
                return next
              })
              setSelectedRoleId(role.id)
              void reloadRoleDetails(role.id)
            }}
          />
          <Button variant="outline" onClick={() => selectedRoleId != null && reloadRoleDetails(selectedRoleId)} disabled={selectedRoleId == null}>
            Refresh
          </Button>
          <Button onClick={() => setAssignOpen(true)} disabled={!selectedRoleId}>
            Assign User
          </Button>
        </div>

        {(rolesError || locationsError || roleDetailsError || actionError) && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {rolesError || locationsError || roleDetailsError || actionError}
          </div>
        )}

        {roleDetails && (
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium text-foreground">{roleDetails.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{roleDetails.description || "—"}</div>
              <div className="mt-3 text-sm text-muted-foreground">
                Group: <span className="text-foreground">{roleDetails.group_name}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Location based: <span className="text-foreground">{roleDetails.is_location_based ? "Yes" : "No"}</span>
              </div>
              {roleDetails.is_location_based && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Template: <span className="text-foreground">{roleDetails.location_group_template}</span>
                </div>
              )}
            </div>

            <div className="rounded-md border p-3 lg:col-span-2">
              <div className="text-sm font-medium text-foreground">Active Assignments</div>
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleDetailsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : roleDetails.assignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          No assignments yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      roleDetails.assignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium text-foreground">{a.user.full_name || a.user.email}</div>
                            <div className="text-muted-foreground">{a.user.email}</div>
                          </TableCell>
                          <TableCell className="text-sm">{a.location?.name ?? "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(a.assigned_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  setActionError(null)
                                  await apiDeactivateRoleAssignment(props.apiBaseUrl, props.token, a.id)
                                  if (selectedRoleId != null) await reloadRoleDetails(selectedRoleId)
                                } catch (e) {
                                  setActionError(getErrorMessage(e, "Failed to deactivate assignment"))
                                }
                              }}
                            >
                              Deactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-md border p-3 lg:col-span-3">
              <div className="text-sm font-medium text-foreground">Inactive Assignments</div>
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Previously Assigned</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveAssignmentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : inactiveAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          No inactive assignments.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inactiveAssignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium text-foreground">{a.user_email}</div>
                            <div className="text-muted-foreground">{a.assigned_by_name ?? "Previously assigned"}</div>
                          </TableCell>
                          <TableCell className="text-sm">{a.location_name ?? "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(a.assigned_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  setActionError(null)
                                  await apiCreateRoleAssignment(props.apiBaseUrl, props.token, {
                                    user: a.user,
                                    role: a.role,
                                    location: a.location,
                                    reason: a.reason || undefined,
                                  })
                                  if (selectedRoleId != null) await reloadRoleDetails(selectedRoleId)
                                } catch (e) {
                                  setActionError(getErrorMessage(e, "Failed to reactivate assignment"))
                                }
                              }}
                            >
                              Reactivate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {!roleDetails && !roleDetailsLoading && (
          <div className="text-sm text-muted-foreground">{rolesLoading ? "Loading..." : "Select a role to view assignments."}</div>
        )}
      </CardContent>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Role: <span className="text-foreground">{roleDetails?.name ?? selectedRole?.name ?? "—"}</span>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">User</div>
              <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search by email or name..." />
              <div className="max-h-56 overflow-auto rounded-md border">
                {userLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Searching…</div>
                ) : userResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No results.</div>
                ) : (
                  userResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`flex w-full items-start justify-between gap-2 border-b p-3 text-left last:border-b-0 ${
                        selectedUserId === u.id ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{u.full_name || u.email}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{selectedUserId === u.id ? "Selected" : ""}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {isLocationBased && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Location</div>
                <Select
                  value={selectedLocationId}
                  onChange={setSelectedLocationId}
                  options={[
                    { value: "", label: "Select a location" },
                    ...flatLocations.map((l) => ({ value: l.id, label: l.name })),
                  ]}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Reason (optional)</div>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you assigning this role?" />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedRoleId || !selectedUserId) return
                if (isLocationBased && !selectedLocationId) return
                try {
                  setActionError(null)
                  await apiCreateRoleAssignment(props.apiBaseUrl, props.token, {
                    user: selectedUserId,
                    role: selectedRoleId,
                    location: isLocationBased ? selectedLocationId : null,
                    reason: reason.trim() || undefined,
                  })
                  await reloadRoleDetails(selectedRoleId)
                  setAssignOpen(false)
                } catch (e) {
                  setActionError(getErrorMessage(e, "Failed to assign role"))
                }
              }}
              disabled={!selectedRoleId || !selectedUserId || (isLocationBased && !selectedLocationId)}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
