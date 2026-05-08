"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

import {
  apiGetGroup,
  apiGetGroupPermissions,
  apiGetGroupUsers,
  apiListGroups,
  apiRemovePermissionsFromGroup,
  apiRemoveUsersFromGroup,
  getApiBaseUrl,
  type RbacGroup,
  type RbacPermission,
  type RbacUser,
} from "@/lib/api"
import { getErrorMessage, parsePositiveInt } from "@/lib/rbacUtils"
import { Button } from "@/components/ui/button"
import { CreateGroupDialog } from "@/components/pages/admin/groups/CreateGroupDialog"
import { AddUsersDialog } from "@/components/pages/admin/groups/AddUsersDialog"
import { AddPermissionsDialog } from "@/components/pages/admin/groups/AddPermissionsDialog"
import { GroupListCard } from "@/components/pages/admin/groups/GroupListCard"
import { GroupDetailsCard } from "@/components/pages/admin/groups/GroupDetailsCard"

type TabKey = "users" | "permissions"

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

  const [activeTab, setActiveTab] = useState<TabKey>("users")

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [group, setGroup] = useState<RbacGroup | null>(null)
  const [groupUsers, setGroupUsers] = useState<RbacUser[]>([])
  const [groupPermissions, setGroupPermissions] = useState<RbacPermission[]>([])

  const [addUsersOpen, setAddUsersOpen] = useState(false)
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
        const [g, users, perms] = await Promise.all([
          apiGetGroup(apiBaseUrl, token as string, nextGroupId),
          apiGetGroupUsers(apiBaseUrl, token as string, nextGroupId),
          apiGetGroupPermissions(apiBaseUrl, token as string, nextGroupId),
        ])
        setGroup(g)
        setGroupUsers(users)
        setGroupPermissions(perms)
      } catch (e) {
        setDetailsError(getErrorMessage(e, "Failed to load group details"))
        setGroup(null)
        setGroupUsers([])
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

  const existingUserIds = useMemo(() => groupUsers.map((u) => u.id), [groupUsers])
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
          groupUsers={groupUsers}
          groupPermissions={groupPermissions}
          loading={detailsLoading}
          error={detailsError}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={() => selectedGroupId && reloadSelected(selectedGroupId)}
          onOpenAddUsers={() => setAddUsersOpen(true)}
          onOpenAddPermissions={() => setAddPermissionsOpen(true)}
          onRemoveUser={async (userId) => {
            if (!selectedGroupId) return
            try {
              await apiRemoveUsersFromGroup(apiBaseUrl, token as string, selectedGroupId, [userId])
              setGroupUsers((prev) => prev.filter((x) => x.id !== userId))
              setGroups((prev) => prev.map((g) => (g.id === selectedGroupId ? { ...g, user_count: Math.max(0, g.user_count - 1) } : g)))
              setGroup((prev) => (prev ? { ...prev, user_count: Math.max(0, prev.user_count - 1) } : prev))
            } catch (e) {
              setDetailsError(getErrorMessage(e, "Failed to remove user"))
            }
          }}
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

      {selectedGroupId && token && apiBaseUrl && (
        <>
          <AddUsersDialog
            open={addUsersOpen}
            onOpenChange={setAddUsersOpen}
            apiBaseUrl={apiBaseUrl}
            token={token}
            groupId={selectedGroupId}
            existingUserIds={existingUserIds}
            onAdded={async () => {
              await reloadSelected(selectedGroupId)
              const list = await apiListGroups(apiBaseUrl, token)
              setGroups(list)
            }}
          />
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
