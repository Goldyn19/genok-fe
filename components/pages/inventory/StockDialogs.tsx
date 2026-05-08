"use client"

import { useMemo, useState } from "react"

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
  price: string
}

function toDraft(stock: Stock | null, locations: Location[]): StockDraft {
  const defaultLocation = locations[0]?.id ?? ""
  return {
    part_name: stock?.part_name ?? "",
    part_number: stock?.part_number ?? "",
    location: stock?.location ?? defaultLocation,
    balance: stock ? "" : "",
    price: stock?.price != null ? String(stock.price) : "",
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
  return errors
}

export function CreateOrUpdateStockDialog({
  open,
  onOpenChange,
  locations,
  stock,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  stock: Stock | null
  onSave: (next: Stock) => Promise<void>
}) {
  const [draft, setDraft] = useState<StockDraft>(() => toDraft(stock, locations))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const mode: "create" | "edit" = stock ? "edit" : "create"

  const locationOptions = useMemo(
    () => [{ value: "", label: "Select location" }, ...locations.map((l) => ({ value: l.id, label: l.location }))],
    [locations]
  )

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
            <div className="text-xs font-medium text-muted-foreground">Location</div>
            <Select value={draft.location} onChange={(v) => setDraft((p) => ({ ...p, location: v }))} options={locationOptions} />
            {errors.location && <div className="text-xs text-destructive">{errors.location}</div>}
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
                price: draft.price.trim() ? Number(draft.price) : null,
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

