"use client"

import { useMemo } from "react"

import type { Location } from "@/lib/types"
import { cn } from "@/lib/utils"

type TreeItem = Location & { depth: number }

function buildTree(locations: Location[]) {
  const byParent = new Map<string, Location[]>()
  for (const l of locations) {
    const key = l.parent ?? "root"
    const list = byParent.get(key) ?? []
    list.push(l)
    byParent.set(key, list)
  }

  const walk = (parent: string, depth: number, out: TreeItem[]) => {
    const children = (byParent.get(parent) ?? []).slice().sort((a, b) => a.location.localeCompare(b.location))
    for (const child of children) {
      out.push({ ...child, depth })
      walk(child.id, depth + 1, out)
    }
  }

  const out: TreeItem[] = []
  walk("root", 0, out)
  return out
}

export function LocationTree({ locations }: { locations: Location[] }) {
  const items = useMemo(() => buildTree(locations), [locations])

  return (
    <div className="space-y-1">
      {items.map((l) => (
        <div
          key={l.id}
          className={cn(
            "flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm",
            l.depth === 0 ? "font-medium" : "text-muted-foreground"
          )}
          style={{ paddingLeft: 12 + l.depth * 12 }}
        >
          <span>{l.location}</span>
        </div>
      ))}
      {items.length === 0 && <div className="text-sm text-muted-foreground">No locations yet.</div>}
    </div>
  )
}

