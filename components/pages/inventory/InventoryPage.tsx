"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

import type { Location, Stock } from "@/lib/types"
import { apiCreateLocation, apiCreatePurchase, apiDeleteLocation, apiListLocations, apiListStock, apiUpdateLocation, apiUpdateStock, getApiBaseUrl } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StockTable } from "@/components/pages/inventory/StockTable"
import { StockDetailSheet } from "@/components/pages/inventory/StockDetailSheet"
import { CreateLocationDialog, CreateOrUpdateStockDialog, RequestStockIncreaseDialog } from "@/components/pages/inventory/StockDialogs"

const LOW_STOCK_THRESHOLD = 10
const PAGE_SIZE = 10

type SortKey = "part_name" | "part_number" | "location" | "balance" | "price"
type SortDir = "asc" | "desc"

function compare(a: Stock, b: Stock, key: SortKey, dir: SortDir, locations: Location[]) {
  const mult = dir === "asc" ? 1 : -1
  const locationLabel = (id: string) => locations.find((l) => l.id === id)?.location ?? ""
  if (key === "balance") return mult * (a.balance - b.balance)
  if (key === "price") return mult * ((a.price ?? -1) - (b.price ?? -1))
  if (key === "location") return mult * locationLabel(a.location).localeCompare(locationLabel(b.location))
  return mult * String(a[key]).localeCompare(String(b[key]))
}

export function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") ?? ""

  const { data: session } = useSession()

  const [locations, setLocations] = useState<Location[]>([])
  const [stock, setStock] = useState<Stock[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [q, setQ] = useState(initialQ)
  const [locationFilter, setLocationFilter] = useState<string>("")
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>({ key: "part_number", dir: "asc" })
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<Stock | null>(null)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [increaseDialogOpen, setIncreaseDialogOpen] = useState(false)

  const apiBaseUrl = getApiBaseUrl()
  const token = session?.accessToken

  useEffect(() => {
    const tokenStr = token
    if (!apiBaseUrl || !tokenStr) return

    let cancelled = false
    ;(async () => {
      try {
        setLoadError(null)
        const [rows, locsRes] = await Promise.all([apiListStock(apiBaseUrl, tokenStr), apiListLocations(apiBaseUrl, tokenStr)])
        if (cancelled) return
        const mapped: Stock[] = rows.map((r) => ({
          id: r.id,
          part_name: r.part_name,
          part_number: r.part_number,
          location: r.location_detail?.id ?? "",
          balance: r.display_balance,
          price: r.price ?? null,
        }))
        setStock(mapped)

        const locs: Location[] = locsRes.map((l) => ({ id: l.id, location: l.location, parent: l.parent ?? null }))
        setLocations(locs)
      } catch (e) {
        if (cancelled) return
        const message =
          typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? ((e as { message?: unknown }).message as string)
            : "Failed to load stock"
        setLoadError(message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, token])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return stock.filter((s) => {
      const hay = [s.part_name, s.part_number, s.location].join(" ").toLowerCase()
      const matchTerm = !term || hay.includes(term)
      const matchLocation = !locationFilter || s.location === locationFilter
      return matchTerm && matchLocation
    })
  }, [q, stock, locationFilter])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    return filtered.slice().sort((a, b) => compare(a, b, sort.key, sort.dir, locations))
  }, [filtered, sort, locations])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (pageClamped - 1) * PAGE_SIZE
    return sorted.slice(start, start + PAGE_SIZE)
  }, [sorted, pageClamped])

  const locationOptions = useMemo(
    () => [{ value: "", label: "All locations" }, ...locations.map((l) => ({ value: l.id, label: l.location }))],
    [locations]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Search stock, open a row for details, and maintain records.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setStockDialogOpen(true)}>Create Stock</Button>
          <Button variant="outline" onClick={() => setLocationDialogOpen(true)}>
            Create Location
          </Button>
        </div>
      </div>

      {loadError && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}
      {notice && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <Input
              value={q}
              onChange={(e) => {
                const next = e.target.value
                setQ(next)
                setPage(1)
                router.replace(`/inventory?q=${encodeURIComponent(next)}`)
              }}
              placeholder="Search by part name/number and location"
            />
            <Select
              value={locationFilter}
              onChange={(v) => {
                setLocationFilter(v)
                setPage(1)
              }}
              options={locationOptions}
            />
          </div>

          <StockTable
            rows={paged}
            locations={locations}
            lowStockThreshold={LOW_STOCK_THRESHOLD}
            sort={sort}
            onSort={(key) => {
              setPage(1)
              setSort((prev) => {
                if (!prev || prev.key !== key) return { key, dir: "asc" }
                return { key, dir: prev.dir === "asc" ? "desc" : "asc" }
              })
            }}
            onRowClick={(row) => setSelected(row)}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{paged.length}</span> of{" "}
              <span className="font-medium text-foreground">{sorted.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageClamped <= 1}
              >
                Prev
              </Button>
              <div className="text-xs text-muted-foreground tabular-nums">
                Page <span className="font-medium text-foreground">{pageClamped}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageClamped >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <StockDetailSheet
        stock={selected}
        locations={locations}
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null)
        }}
        onEdit={() => {
          setStockDialogOpen(true)
        }}
        onRequestIncrease={() => {
          setIncreaseDialogOpen(true)
        }}
      />

      <RequestStockIncreaseDialog
        open={increaseDialogOpen}
        onOpenChange={setIncreaseDialogOpen}
        stock={selected}
        onRequest={async ({ quantity, price }) => {
          const tokenStr = token
          if (!apiBaseUrl || !tokenStr) throw new Error("Missing API base URL or auth token")
          if (!selected) throw new Error("No stock selected")
          const purchase = await apiCreatePurchase(apiBaseUrl, tokenStr, {
            name: selected.part_name,
            part_number: selected.part_number,
            location: selected.location,
            price,
            quantity,
            is_new_product: false,
            stock: selected.id,
          })
          setNotice(`Purchase request #${purchase.id} created (status: ${purchase.status}). Approvals pending.`)
        }}
      />

      <CreateOrUpdateStockDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        locations={locations}
        stock={selected}
        onSave={async (next) => {
          const tokenStr = token
          if (!apiBaseUrl || !tokenStr) throw new Error("Missing API base URL or auth token")

          setNotice(null)

          if (selected) {
            await apiUpdateStock(apiBaseUrl, tokenStr, selected.id, {
              part_name: next.part_name,
              part_number: next.part_number,
              location: next.location,
              price: next.price ?? null,
            })
            setStock((prev) =>
              prev.map((p) =>
                p.id === selected.id
                  ? {
                      ...p,
                      part_name: next.part_name,
                      part_number: next.part_number,
                      location: next.location,
                      price: next.price ?? null,
                    }
                  : p
              )
            )
            setNotice("Stock details updated.")
            return
          }

          const purchase = await apiCreatePurchase(apiBaseUrl, tokenStr, {
            name: next.part_name,
            part_number: next.part_number,
            location: next.location,
            price: next.price ?? null,
            quantity: next.balance,
            is_new_product: true,
          })

          setNotice(`Purchase request #${purchase.id} created (status: ${purchase.status}). Approvals pending.`)
        }}
      />

      <CreateLocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        locations={locations}
        onCreate={async (loc) => {
          const tokenStr = token
          if (!apiBaseUrl || !tokenStr) throw new Error("Missing API base URL or auth token")
          const created = await apiCreateLocation(apiBaseUrl, tokenStr, { location: loc.location, parent: loc.parent ?? null })
          setLocations((prev) => [created, ...prev])
        }}
        onUpdate={async (loc) => {
          const tokenStr = token
          if (!apiBaseUrl || !tokenStr) throw new Error("Missing API base URL or auth token")
          const updated = await apiUpdateLocation(apiBaseUrl, tokenStr, loc.id, { location: loc.location, parent: loc.parent ?? null })
          setLocations((prev) => prev.map((p) => (p.id === updated.id ? { id: updated.id, location: updated.location, parent: updated.parent ?? null } : p)))
        }}
        onDelete={async (id) => {
          const tokenStr = token
          if (!apiBaseUrl || !tokenStr) throw new Error("Missing API base URL or auth token")
          await apiDeleteLocation(apiBaseUrl, tokenStr, id)
          setLocations((prev) => prev.filter((p) => p.id !== id))
        }}
      />
    </div>
  )
}

