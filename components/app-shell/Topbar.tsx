"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Menu, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { signOut, useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/uiStore"

const TITLE_BY_ROUTE: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/activity": "Purchases & Sales",
  "/credits": "Customer Credit",
  "/carts": "Carts",
  "/notifications": "Notifications",
  "/account": "My Account",
  "/admin/groups": "Groups & Permissions",
}

function breadcrumbItems(pathname: string) {
  if (pathname.startsWith("/parts/")) {
    const partNumber = decodeURIComponent(pathname.replace("/parts/", ""))
    return [
      { label: "Inventory", href: "/inventory" },
      { label: partNumber, href: pathname },
    ]
  }

  if (pathname.startsWith("/credits/")) {
    const creditId = decodeURIComponent(pathname.replace("/credits/", ""))
    return [
      { label: "Customer Credit", href: "/credits" },
      { label: creditId, href: pathname },
    ]
  }

  if (pathname.startsWith("/carts/")) {
    const cartId = decodeURIComponent(pathname.replace("/carts/", ""))
    return [
      { label: "Carts", href: "/carts" },
      { label: cartId, href: pathname },
    ]
  }

  const title = TITLE_BY_ROUTE[pathname] ?? "Genok"
  return [{ label: title, href: pathname }]
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [q, setQ] = useState(searchParams.get("q") ?? "")
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen)
  const toggleMobileNavOpen = useUIStore((s) => s.toggleMobileNavOpen)

  const title = useMemo(() => {
    if (pathname.startsWith("/parts/")) return "Part Detail"
    if (pathname.startsWith("/credits/")) return "Credit Record"
    if (pathname.startsWith("/carts/")) return "Cart Details"
    return TITLE_BY_ROUTE[pathname] ?? "Genok"
  }, [pathname])

  const crumbs = useMemo(() => breadcrumbItems(pathname), [pathname])

  const firstName = useMemo(() => {
    const rawName = (session?.user?.name ?? "").trim()
    if (rawName) return rawName.split(/\s+/)[0]
    const rawEmail = (session?.user?.email ?? "").trim()
    if (rawEmail && rawEmail.includes("@")) return rawEmail.split("@")[0]
    return "User"
  }, [session?.user?.email, session?.user?.name])

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileNavOpen}
          aria-controls="app-sidenav-drawer"
          onClick={toggleMobileNavOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-foreground">{title}</div>
            <Separator orientation="vertical" className="h-4" />
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                {crumbs.map((c, idx) => (
                  <li key={c.href} className="min-w-0">
                    <Link
                      href={c.href}
                      className={cn(
                        "truncate hover:text-foreground",
                        idx === crumbs.length - 1 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="truncate text-xs text-muted-foreground">Industrial inventory operations</div>
        </div>

        <div className="hidden w-[360px] items-center gap-2 rounded-md border bg-card px-2 sm:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = q.trim()
              if (!trimmed) return
              router.push(`/inventory?q=${encodeURIComponent(trimmed)}`)
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search parts fast..."
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-medium text-foreground sm:inline">{firstName}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              signOut({ callbackUrl: "/login" })
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}

