"use client"

import { cn } from "@/lib/utils"
import type { RbacGroup } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function GroupListCard(props: {
  groups: RbacGroup[]
  loading: boolean
  error: string | null
  query: string
  onQueryChange: (value: string) => void
  selectedGroupId: number | null
  onSelect: (groupId: number) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Groups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={props.query} onChange={(e) => props.onQueryChange(e.target.value)} placeholder="Search groups…" />

        {props.error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{props.error}</div>}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead className="w-[120px]">Users</TableHead>
                <TableHead className="w-[120px]">Perms</TableHead>
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
              {!props.loading && props.groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    No groups found.
                  </TableCell>
                </TableRow>
              )}
              {!props.loading &&
                props.groups.map((g) => {
                  const active = g.id === props.selectedGroupId
                  return (
                    <TableRow
                      key={g.id}
                      className={cn("cursor-pointer", active ? "bg-accent" : "")}
                      onClick={() => props.onSelect(g.id)}
                    >
                      <TableCell>
                        <div className="text-sm font-medium text-foreground">{g.name}</div>
                        <div className="text-xs text-muted-foreground">ID {g.id}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{g.user_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{g.permissions.length}</TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

