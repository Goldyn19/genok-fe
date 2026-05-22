"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { apiCreateRole, type RbacRole } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, type SelectOption } from "@/components/ui/select"

export function CreateRoleDialog(props: {
  apiBaseUrl: string
  token: string
  locationOptions: SelectOption[]
  onCreated: (role: RbacRole) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [approvalPriority, setApprovalPriority] = useState("")
  const [isLocationBased, setIsLocationBased] = useState(false)
  const [locationGroupTemplate, setLocationGroupTemplate] = useState("")
  const [previewLocationId, setPreviewLocationId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewLocationName = useMemo(() => {
    if (!previewLocationId) return ""
    return props.locationOptions.find((o) => o.value === previewLocationId)?.label ?? ""
  }, [previewLocationId, props.locationOptions])

  const templatePreview = useMemo(() => {
    if (!isLocationBased) return ""
    if (!previewLocationId) return ""
    const locName = previewLocationName
    const locId = previewLocationId
    return locationGroupTemplate
      .replaceAll("{location_name}", locName)
      .replaceAll("{location_id}", locId)
      .replaceAll("{location_code}", "")
  }, [isLocationBased, locationGroupTemplate, previewLocationId, previewLocationName])

  const canCreate = useMemo(() => {
    const trimmed = name.trim()
    if (!trimmed) return false
    if (isLocationBased && !locationGroupTemplate.trim()) return false
    if (saving) return false
    return true
  }, [isLocationBased, locationGroupTemplate, name, saving])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) return
        setName("")
        setDescription("")
        setApprovalPriority("")
        setIsLocationBased(false)
        setLocationGroupTemplate("")
        setPreviewLocationId("")
        setSaving(false)
        setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Create role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Role name</div>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="e.g. Floor Manager"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Description (optional)</div>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setError(null)
              }}
              placeholder="What can this role do?"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Approval priority (optional)</div>
            <Input
              value={approvalPriority}
              onChange={(e) => {
                setApprovalPriority(e.target.value)
                setError(null)
              }}
              placeholder="0"
              inputMode="numeric"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isLocationBased}
              onChange={(e) => {
                setIsLocationBased(e.target.checked)
                setError(null)
                if (!e.target.checked) {
                  setLocationGroupTemplate("")
                  setPreviewLocationId("")
                }
              }}
            />
            <span className="text-sm text-foreground">Location-based role</span>
          </label>

          {isLocationBased && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">Location group template</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationGroupTemplate((prev) => (prev ? `${prev} {location_name}` : "{location_name}"))}
                    >
                      + location_name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationGroupTemplate((prev) => (prev ? `${prev} {location_id}` : "{location_id}"))}
                    >
                      + location_id
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationGroupTemplate((prev) => (prev ? `${prev} {location_code}` : "{location_code}"))}
                    >
                      + location_code
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const trimmed = name.trim()
                        setLocationGroupTemplate(`{location_name} ${trimmed || "Manager"}`)
                      }}
                    >
                      Use role name
                    </Button>
                  </div>
                </div>
                <Input
                  value={locationGroupTemplate}
                  onChange={(e) => {
                    setLocationGroupTemplate(e.target.value)
                    setError(null)
                  }}
                  placeholder="{location_name} Manager"
                />
                <div className="text-xs text-muted-foreground">Variables: location_name, location_code, location_id</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Preview location</div>
                <Select
                  value={previewLocationId}
                  onChange={setPreviewLocationId}
                  options={[
                    { value: "", label: props.locationOptions.length ? "Select a location" : "No locations available" },
                    ...props.locationOptions,
                  ]}
                  disabled={props.locationOptions.length === 0}
                />
                <div className="text-xs text-muted-foreground">
                  Preview: <span className="text-foreground">{templatePreview || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={!canCreate}
            onClick={async () => {
              const trimmed = name.trim()
              if (!trimmed) return
              if (isLocationBased && !locationGroupTemplate.trim()) return

              const prio = approvalPriority.trim()
              const approval_priority =
                prio.length === 0 ? undefined : Number.isFinite(Number(prio)) ? Math.trunc(Number(prio)) : undefined

              try {
                setSaving(true)
                setError(null)
                const role = await apiCreateRole(props.apiBaseUrl, props.token, {
                  name: trimmed,
                  description: description.trim() || undefined,
                  approval_priority,
                  is_location_based: isLocationBased,
                  location_group_template: isLocationBased ? locationGroupTemplate.trim() : undefined,
                  is_active: true,
                })
                props.onCreated(role)
                setOpen(false)
              } catch (e) {
                const message =
                  typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                    ? ((e as { message?: unknown }).message as string)
                    : "Failed to create role"
                setError(message)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
