import type { LucideIcon } from "lucide-react"
import { Boxes, LayoutDashboard, PackageSearch, Shield, ShoppingCart, User, Bell } from "lucide-react"

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/parts", label: "Parts", icon: PackageSearch },
  { to: "/carts", label: "Carts", icon: ShoppingCart },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/account", label: "My Account", icon: User },
  { to: "/admin/groups", label: "Groups & Permissions", icon: Shield },
]

