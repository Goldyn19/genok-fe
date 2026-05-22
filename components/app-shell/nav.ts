import type { LucideIcon } from "lucide-react"
import { Bell, Boxes, CreditCard, LayoutDashboard, PackageSearch, Shield, ShoppingCart, User } from "lucide-react"

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/activity", label: "Purchases & Sales", icon: PackageSearch },
  { to: "/credits", label: "Customer Credit", icon: CreditCard },
  { to: "/carts", label: "Carts", icon: ShoppingCart },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/account", label: "My Account", icon: User },
  { to: "/admin/groups", label: "Groups & Permissions", icon: Shield },
]

