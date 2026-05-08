"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { apiCreateGroup, type RbacGroup } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function CreateGroupDialog(props: {
  apiBaseUrl: string
  token: string
  onCreated: (group: RbacGroup) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = name.trim().length > 0 && !saving

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) return
        setName("")
        setError(null)
        setSaving(false)
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Group name</div>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder="e.g. Warehouse Managers"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
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
              try {
                setSaving(true)
                setError(null)
                const group = await apiCreateGroup(props.apiBaseUrl, props.token, { name: trimmed })
                props.onCreated(group)
                setOpen(false)
              } catch (e) {
                const message =
                  typeof e === "object" && e != null && "message" in e && typeof (e as { message?: unknown }).message === "string"
                    ? ((e as { message?: unknown }).message as string)
                    : "Failed to create group"
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

