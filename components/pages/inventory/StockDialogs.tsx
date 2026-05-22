"use client"

import { useEffect, useMemo, useState } from "react"

import type { Location, Stock } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { LocationTree } from "@/components/pages/inventory/LocationTree"
import { cn } from "@/lib/utils"

type StockDraft = {
  part_name: string
  part_number: string
  location: string
  balance: string
  parent: string
  price: string
  is_caterpillar: string
  brand: string
  is_original: string
}

function toDraft(stock: Stock | null, locations: Location[]): StockDraft {
  const defaultLocation = locations[0]?.id ?? ""
  return {
    part_name: stock?.part_name ?? "",
    part_number: stock?.part_number ?? "",
    location: stock?.location ?? defaultLocation,
    balance: stock ? "" : "",
    parent: stock?.parent ?? "",
    price: stock?.price != null ? String(stock.price) : "",
    is_caterpillar: String(stock?.is_caterpillar ?? true),
    brand: stock?.brand ?? "",
    is_original: String(stock?.is_original ?? true),
  }
}

function validateDraft(d: StockDraft, mode: "create" | "edit") {
  const errors: Partial<Record<keyof StockDraft, string>> = {}
  if (!d.part_name.trim()) errors.part_name = "Required"
  if (!d.part_number.trim()) errors.part_number = "Required"
  if (!d.location) errors.location = "Required"
  if (mode === "create") {
    const balance = Number(d.balance)
    if (!Number.isFinite(balance) || balance <= 0) errors.balance = "Must be a positive number"
  }
  if (d.price.trim()) {
    const price = Number(d.price)
    if (!Number.isFinite(price) || price < 0) errors.price = "Must be a non-negative number"
  }
  if (d.brand.trim() && d.brand.trim().length > 80) errors.brand = "Too long"
  return errors
}

export function CreateOrUpdateStockDialog({
  open,
  onOpenChange,
  locations,
  stockOptions,
  onSearchLocations,
  onSearchParentStock,
  stock,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  stockOptions: Stock[]
  onSearchLocations?: (q: string) => Promise<Location[]>
  onSearchParentStock?: (q: string) => Promise<Stock[]>
  stock: Stock | null
  onSave: (next: Stock) => Promise<void>
}) {
  const [draft, setDraft] = useState<StockDraft>(() => toDraft(stock, locations))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [locationQuery, setLocationQuery] = useState("")
  const [locationMatches, setLocationMatches] = useState<Location[] | null>(null)
  const [locationSearching, setLocationSearching] = useState(false)
  const [parentQuery, setParentQuery] = useState("")
  const [parentMatches, setParentMatches] = useState<Stock[] | null>(null)
  const [parentSearching, setParentSearching] = useState(false)

  const mode: "create" | "edit" = stock ? "edit" : "create"

  const locationOptions = useMemo(
    () => {
      const source = locationMatches ?? locations
      const term = locationQuery.trim().toLowerCase()
      const filtered = source.filter((l) => !term || l.location.toLowerCase().includes(term))
      const base = [{ value: "", label: "Select location" }, ...filtered.map((l) => ({ value: l.id, label: l.location }))]
      if (draft.location && !base.some((o) => o.value === draft.location)) {
        const selected = (locationMatches ?? locations).find((l) => l.id === draft.location) ?? locations.find((l) => l.id === draft.location)
        if (selected) base.push({ value: selected.id, label: selected.location })
      }
      return base
    },
    [locations, locationMatches, locationQuery, draft.location]
  )

  const parentOptions = useMemo(() => {
    const source = parentMatches ?? stockOptions
    const term = parentQuery.trim().toLowerCase()
    const base = source.filter((s) => s.id !== stock?.id)
    const filtered = base.filter((s) => {
      if (!term) return true
      const hay = [s.part_number, s.part_name, s.brand ?? ""].join(" ").toLowerCase()
      return hay.includes(term)
    })
    const sorted = filtered.slice().sort((a, b) => a.part_number.localeCompare(b.part_number))
    const out = [{ value: "", label: "No parent" }, ...sorted.map((s) => ({ value: s.id, label: `${s.part_number} — ${s.part_name}` }))]
    if (draft.parent && !out.some((o) => o.value === draft.parent)) {
      const selected = (parentMatches ?? stockOptions).find((s) => s.id === draft.parent) ?? stockOptions.find((s) => s.id === draft.parent)
      if (selected) out.push({ value: selected.id, label: `${selected.part_number} — ${selected.part_name}` })
    }
    return out
  }, [stockOptions, parentMatches, parentQuery, stock?.id, draft.parent])

  const locationResults = useMemo(() => {
    const term = locationQuery.trim().toLowerCase()
    if (!term) return []
    const source = locationMatches ?? locations
    return source.filter((l) => l.location.toLowerCase().includes(term)).slice(0, 8)
  }, [locationMatches, locations, locationQuery])

  const parentResults = useMemo(() => {
    const term = parentQuery.trim().toLowerCase()
    if (!term) return []
    const source = parentMatches ?? stockOptions
    return source
      .filter((s) => s.id !== stock?.id)
      .filter((s) => {
        const hay = [s.part_number, s.part_name, s.brand ?? ""].join(" ").toLowerCase()
        return hay.includes(term)
      })
      .slice(0, 8)
  }, [parentMatches, stockOptions, parentQuery, stock?.id])

  useEffect(() => {
    if (!open) return
    if (!onSearchLocations) return
    const term = locationQuery.trim()
    if (!term) {
      setLocationMatches(null)
      setLocationSearching(false)
      return
    }

    let cancelled = false
    setLocationSearching(true)
    const t = setTimeout(() => {
      onSearchLocations(term)
        .then((rows) => {
          if (!cancelled) setLocationMatches(rows)
          if (!cancelled) setLocationSearching(false)
        })
        .catch(() => {
          if (!cancelled) setLocationMatches(null)
          if (!cancelled) setLocationSearching(false)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, onSearchLocations, locationQuery])

  useEffect(() => {
    if (!open) return
    if (!onSearchParentStock) return
    const term = parentQuery.trim()
    if (!term) {
      setParentMatches(null)
      setParentSearching(false)
      return
    }

    let cancelled = false
    setParentSearching(true)
    const t = setTimeout(() => {
      onSearchParentStock(term)
        .then((rows) => {
          if (!cancelled) setParentMatches(rows)
          if (!cancelled) setParentSearching(false)
        })
        .catch(() => {
          if (!cancelled) setParentMatches(null)
          if (!cancelled) setParentSearching(false)
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, onSearchParentStock, parentQuery])

  const errors = useMemo(() => (submitted ? validateDraft(draft, mode) : {}), [draft, submitted, mode])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (v) {
          setDraft(toDraft(stock, locations))
          setSubmitted(false)
          setSaving(false)
          setSaveError("")
          setLocationQuery("")
          setLocationMatches(null)
          setParentQuery("")
          setParentMatches(null)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stock ? "Update Stock" : "Create Stock"}</DialogTitle>
          <DialogDescription>{stock ? "Update stock details." : "Create a stock entry request."}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Part Name</div>
            <Input
              value={draft.part_name}
              onChange={(e) => setDraft((p) => ({ ...p, part_name: e.target.value }))}
              placeholder="e.g., Hydraulic Seal Kit"
            />
            {errors.part_name && <div className="text-xs text-destructive">{errors.part_name}</div>}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Part Number</div>
            <Input
              value={draft.part_number}
              onChange={(e) => setDraft((p) => ({ ...p, part_number: e.target.value }))}
              placeholder="e.g., PN-10021"
            />
            {errors.part_number && <div className="text-xs text-destructive">{errors.part_number}</div>}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Brand (optional)</div>
            <Input value={draft.brand} onChange={(e) => setDraft((p) => ({ ...p, brand: e.target.value }))} placeholder="e.g., Caterpillar" />
            {errors.brand && <div className="text-xs text-destructive">{errors.brand}</div>}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Location</div>
            <Input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Search location…" />
            {locationQuery.trim() && (
              <div className="overflow-hidden rounded-md border bg-background">
                {locationSearching ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                ) : locationResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                ) : (
                  <div className="max-h-48 overflow-auto">
                    {locationResults.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted",
                          l.id === draft.location && "bg-muted"
                        )}
                        onClick={() => {
                          setDraft((p) => ({ ...p, location: l.id }))
                          setLocationQuery("")
                          setLocationMatches(null)
                        }}
                      >
                        {l.location}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Select value={draft.location} onChange={(v) => setDraft((p) => ({ ...p, location: v }))} options={locationOptions} />
            {errors.location && <div className="text-xs text-destructive">{errors.location}</div>}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Parent Stock (optional)</div>
            <Input value={parentQuery} onChange={(e) => setParentQuery(e.target.value)} placeholder="Search parent stock…" />
            {parentQuery.trim() && (
              <div className="overflow-hidden rounded-md border bg-background">
                {parentSearching ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                ) : parentResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                ) : (
                  <div className="max-h-48 overflow-auto">
                    {parentResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted",
                          s.id === draft.parent && "bg-muted"
                        )}
                        onClick={() => {
                          setDraft((p) => ({ ...p, parent: s.id }))
                          setParentQuery("")
                          setParentMatches(null)
                        }}
                      >
                        {s.part_number} — {s.part_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Select value={draft.parent} onChange={(v) => setDraft((p) => ({ ...p, parent: v }))} options={parentOptions} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!stock && (
              <div className="grid gap-2">
                <div className="text-xs font-medium text-muted-foreground">Initial Quantity</div>
                <Input value={draft.balance} onChange={(e) => setDraft((p) => ({ ...p, balance: e.target.value }))} />
                {errors.balance && <div className="text-xs text-destructive">{errors.balance}</div>}
              </div>
            )}

            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Price (optional)</div>
              <Input value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))} />
              {errors.price && <div className="text-xs text-destructive">{errors.price}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Caterpillar</div>
              <Select
                value={draft.is_caterpillar}
                onChange={(v) => setDraft((p) => ({ ...p, is_caterpillar: v }))}
                options={[
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Original</div>
              <Select
                value={draft.is_original}
                onChange={(v) => setDraft((p) => ({ ...p, is_original: v }))}
                options={[
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
                ]}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              setSubmitted(true)
              setSaveError("")
              const nextErrors = validateDraft(draft, mode)
              if (Object.keys(nextErrors).length > 0) return
              const next: Stock = {
                id: stock?.id ?? `stk_${Math.random().toString(16).slice(2)}`,
                part_name: draft.part_name.trim(),
                part_number: draft.part_number.trim(),
                location: draft.location,
                balance: Number(draft.balance || 0),
                parent: draft.parent ? draft.parent : null,
                price: draft.price.trim() ? Number(draft.price) : null,
                brand: draft.brand.trim() ? draft.brand.trim() : null,
                is_caterpillar: draft.is_caterpillar === "true",
                is_original: draft.is_original === "true",
              }
              setSaving(true)
              onSave(next)
                .then(() => {
                  onOpenChange(false)
                })
                .catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : "Save failed"
                  setSaveError(msg)
                })
                .finally(() => setSaving(false))
            }}
          >
            {saving ? "Saving" : "Save"}
          </Button>
        </DialogFooter>
        {saveError && <div className="text-sm text-destructive">{saveError}</div>}
      </DialogContent>
    </Dialog>
  )
}

export function CreateLocationDialog({
  open,
  onOpenChange,
  locations,
  onCreate,
  onUpdate,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  onCreate: (location: Location) => Promise<void>
  onUpdate: (location: Location) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [parent, setParent] = useState<string>("")
  const [selectedId, setSelectedId] = useState<string>("")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  const options = useMemo(
    () => {
      const base = locations.filter((l) => l.id !== selectedId)
      return [{ value: "", label: "No parent" }, ...base.map((l) => ({ value: l.id, label: l.location }))]
    },
    [locations, selectedId]
  )

  const nameError = submitted && !name.trim() ? "Required" : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (v) {
          setName("")
          setParent("")
          setSelectedId("")
          setSubmitted(false)
          setSaving(false)
          setSaveError("")
          setDeleteOpen(false)
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Locations</DialogTitle>
          <DialogDescription>Create, update, or delete a location.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Selected location (optional)</div>
              <Select
                value={selectedId}
                onChange={(v) => {
                  setSelectedId(v)
                  setSubmitted(false)
                  setSaveError("")
                  const loc = locations.find((l) => l.id === v) || null
                  setName(loc?.location ?? "")
                  setParent(loc?.parent ?? "")
                }}
                options={[{ value: "", label: "Create new" }, ...locations.map((l) => ({ value: l.id, label: l.location }))]}
              />
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Location Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Warehouse C" />
              {nameError && <div className="text-xs text-destructive">{nameError}</div>}
            </div>
            <div className="grid gap-2">
              <div className="text-xs font-medium text-muted-foreground">Parent Location</div>
              <Select value={parent} onChange={setParent} options={options} />
              <div className={cn("text-xs text-muted-foreground")}>Select a parent to create hierarchy.</div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Existing Locations</div>
            <LocationTree locations={locations} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedId && (
            <Button variant="destructive" type="button" disabled={saving} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          )}
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              setSubmitted(true)
              setSaveError("")
              if (!name.trim()) return
              const next: Location = {
                id: selectedId || `loc_${Math.random().toString(16).slice(2)}`,
                location: name.trim(),
                parent: parent || null,
              }
              setSaving(true)
              ;(selectedId ? onUpdate(next) : onCreate(next))
                .then(() => {
                  onOpenChange(false)
                })
                .catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : "Save failed"
                  setSaveError(msg)
                })
                .finally(() => setSaving(false))
            }}
          >
            {saving ? "Saving" : selectedId ? "Update" : "Create"}
          </Button>
        </DialogFooter>
        {saveError && <div className="text-sm text-destructive">{saveError}</div>}

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Delete location</DialogTitle>
              <DialogDescription>This will permanently delete the location.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" type="button" onClick={() => setDeleteOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                type="button"
                disabled={saving}
                onClick={() => {
                  if (!selectedId) return
                  setSaving(true)
                  setSaveError("")
                  onDelete(selectedId)
                    .then(() => {
                      setDeleteOpen(false)
                      onOpenChange(false)
                    })
                    .catch((e: unknown) => {
                      const msg = e instanceof Error ? e.message : "Delete failed"
                      setSaveError(msg)
                    })
                    .finally(() => setSaving(false))
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

export function RequestStockIncreaseDialog({
  open,
  onOpenChange,
  stock,
  onRequest,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: Stock | null
  onRequest: (payload: { quantity: number; price: number | null }) => Promise<void>
}) {
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const quantityNum = Number(quantity)
  const qtyError = submitted && (!Number.isFinite(quantityNum) || quantityNum <= 0) ? "Must be a positive number" : ""
  const priceNum = price.trim() ? Number(price) : null
  const priceError =
    submitted && price.trim() && (!Number.isFinite(Number(price)) || Number(price) < 0) ? "Must be a non-negative number" : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (v) {
          setQuantity("")
          setPrice("")
          setSubmitted(false)
          setSaving(false)
          setError("")
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stock</DialogTitle>
          <DialogDescription>Create a purchase request to increase this stock balance.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-md border bg-card p-3">
            <div className="text-sm font-medium text-foreground">{stock?.part_name ?? ""}</div>
            <div className="text-xs text-muted-foreground">{stock?.part_number ?? ""}</div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Quantity to add</div>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 10" />
            {qtyError && <div className="text-xs text-destructive">{qtyError}</div>}
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Unit price (optional)</div>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 2500" />
            {priceError && <div className="text-xs text-destructive">{priceError}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => {
              setSubmitted(true)
              setError("")
              if (qtyError || priceError) return
              if (!stock) return
              setSaving(true)
              onRequest({ quantity: Math.floor(quantityNum), price: priceNum })
                .then(() => onOpenChange(false))
                .catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : "Request failed"
                  setError(msg)
                })
                .finally(() => setSaving(false))
            }}
          >
            {saving ? "Submitting" : "Submit request"}
          </Button>
        </DialogFooter>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </DialogContent>
    </Dialog>
  )
}

