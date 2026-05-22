"use client"

import { KeyRound, RefreshCcw } from "lucide-react"

import type { RbacGroup, RbacPermission } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function GroupDetailsCard(props: {
  selectedGroupId: number | null
  selectedGroupName: string
  group: RbacGroup | null
  groupPermissions: RbacPermission[]
  loading: boolean
  error: string | null
  onRefresh: () => void
  onOpenAddPermissions: () => void
  onRemovePermission: (permissionId: number) => void
}) {
  const title = props.selectedGroupId ? props.selectedGroupName || "Group" : "Group details"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {props.selectedGroupId ? "Manage members and permissions for the selected group." : "Select a group to view details."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!props.selectedGroupId || props.loading}
              onClick={props.onRefresh}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {props.error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>}

        {!props.selectedGroupId && <div className="py-10 text-center text-sm text-muted-foreground">Pick a group on the left.</div>}

        {props.selectedGroupId && props.group && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Permissions {props.group.permissions.length}</Badge>
              <Badge variant="secondary">ID {props.group.id}</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Permissions on this group</div>
                <Button variant="outline" size="sm" className="gap-2" onClick={props.onOpenAddPermissions}>
                  <KeyRound className="h-4 w-4" />
                  Add permissions
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead className="w-[140px]">Type</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {props.loading && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    )}
                    {!props.loading && props.groupPermissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                          No permissions assigned.
                        </TableCell>
                      </TableRow>
                    )}
                    {!props.loading &&
                      props.groupPermissions.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{p.name}</div>
                            <div className="text-xs text-muted-foreground">ID {p.id}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{String(p.content_type)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => props.onRemovePermission(p.id)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
