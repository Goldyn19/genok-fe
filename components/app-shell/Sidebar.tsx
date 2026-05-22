"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/uiStore"
import { NAV_ITEMS } from "@/components/app-shell/nav"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function isActivePath(pathname: string, href: string) {
  if (href === "/activity" && pathname.startsWith("/activity/")) return true
  if (href === "/carts" && pathname.startsWith("/carts/")) return true
  if (href === "/credits" && pathname.startsWith("/credits/")) return true
  return pathname === href
}

export function Sidebar() {
  const pathname = usePathname()
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const pendingApprovalCount = useUIStore((s) => s.pendingApprovalCount)

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card md:flex",
          sidebarCollapsed ? "w-[72px]" : "w-[280px]"
        )}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">G</div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">Genok</div>
              <div className="truncate text-xs text-muted-foreground">Admin Dashboard</div>
            </div>
          )}
        </div>
        <Separator />
        <nav aria-label="Primary" className="flex-1 space-y-1 p-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActivePath(pathname, item.to)
            const isNotifications = item.to === "/notifications"
            const link = (
              <Link
                key={item.to}
                href={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {isNotifications && pendingApprovalCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-black">
                      {pendingApprovalCount > 9 ? "9+" : pendingApprovalCount}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            )

            if (!sidebarCollapsed) return link

            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                  {isNotifications && pendingApprovalCount > 0 && (
                    <span className="ml-1 text-yellow-400">({pendingApprovalCount})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
        <Separator />
        <div className={cn("p-2", sidebarCollapsed ? "flex justify-center" : "")}>
          <Button
            variant="ghost"
            className={cn("w-full justify-between", sidebarCollapsed ? "w-10 justify-center px-0" : "")}
            onClick={toggleSidebar}
          >
            <span className={cn(sidebarCollapsed ? "sr-only" : "")}>Collapse</span>
            <ChevronsLeft className={cn("h-4 w-4", sidebarCollapsed ? "rotate-180" : "")} />
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

