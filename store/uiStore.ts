"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type UIState = {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  toggleMobileNavOpen: () => void
  pendingApprovalCount: number
  setPendingApprovalCount: (count: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNavOpen: () => set({ mobileNavOpen: !get().mobileNavOpen }),
      pendingApprovalCount: 0,
      setPendingApprovalCount: (count) => set({ pendingApprovalCount: count }),
    }),
    { name: "genok-ui" }
  )
)

