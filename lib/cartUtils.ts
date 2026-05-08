import type { Cart, CartItem } from "@/lib/cartTypes"

export function safeNumber(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function computeItemSubtotal(item: Pick<CartItem, "quantity" | "unitPrice">) {
  const qty = Math.max(0, Math.floor(safeNumber(item.quantity, 0)))
  const unit = Math.max(0, safeNumber(item.unitPrice, 0))
  return qty * unit
}

export function computeCartSubtotal(items: Array<Pick<CartItem, "quantity" | "unitPrice">>): number
export function computeCartSubtotal(cart: { items: Array<Pick<CartItem, "quantity" | "unitPrice">> }): number
export function computeCartSubtotal(arg: Array<Pick<CartItem, "quantity" | "unitPrice">> | { items: Array<Pick<CartItem, "quantity" | "unitPrice">> }) {
  const items = Array.isArray(arg) ? arg : arg.items
  return items.reduce((sum, it) => sum + computeItemSubtotal(it), 0)
}

export function formatMoney(amount: number) {
  const n = safeNumber(amount, 0)
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n)
}

export function isCartCheckoutReady(cart: Pick<Cart, "status"> & { items: Array<Pick<CartItem, "name" | "quantity" | "unitPrice">> }) {
  if (cart.status !== "open") return false
  const hasValidItem = cart.items.some((it) => it.name.trim().length > 0 && it.quantity >= 1 && it.unitPrice >= 0)
  return hasValidItem
}
