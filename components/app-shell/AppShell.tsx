"use client"

import type { ReactNode } from "react"
import { Suspense, useEffect } from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/uiStore"
import { Sidebar } from "@/components/app-shell/Sidebar"
import { Topbar } from "@/components/app-shell/Topbar"
import { NAV_ITEMS } from "@/components/app-shell/nav"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Link from "next/link"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideChrome = pathname === "/login"
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname, setMobileNavOpen])

  if (hideChrome) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          id="app-sidenav-drawer"
          aria-labelledby="app-sidenav-drawer-title"
          className="w-[80vw] max-w-[320px] p-0"
        >
          <SheetHeader className="border-b px-4 py-4 pr-12">
            <SheetTitle id="app-sidenav-drawer-title">Navigation</SheetTitle>
          </SheetHeader>
          <nav aria-label="Primary" className="space-y-1 p-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/"))
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className={cn("min-h-screen pl-0", sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[280px]")}
      >
        <Suspense fallback={<div className="h-14 border-b bg-background" />}>
          <Topbar />
        </Suspense>
        <main className="p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

