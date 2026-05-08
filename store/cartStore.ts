"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { Cart, CartItem } from "@/lib/cartTypes"

function now() {
  return Date.now()
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${now()}-${Math.random().toString(16).slice(2)}`
}

function clampInt(n: number, min: number) {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.floor(n))
}

function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

type CartState = {
  carts: Cart[]
  createCart: (customerName: string) => string
  deleteCart: (cartId: string) => void
  updateCustomerName: (cartId: string, customerName: string) => void
  addItem: (cartId: string) => string
  updateItem: (cartId: string, itemId: string, patch: Partial<Pick<CartItem, "name" | "quantity" | "unitPrice">>) => void
  removeItem: (cartId: string, itemId: string) => void
  checkout: (cartId: string) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: [],
      createCart: (customerName) => {
        const id = newId()
        const ts = now()
        const cart: Cart = {
          id,
          customerName: customerName.trim(),
          status: "open",
          checkedOutAt: null,
          createdAt: ts,
          updatedAt: ts,
          items: [],
        }
        set({ carts: [cart, ...get().carts] })
        return id
      },
      deleteCart: (cartId) => {
        set({ carts: get().carts.filter((c) => c.id !== cartId) })
      },
      updateCustomerName: (cartId, customerName) => {
        const nextName = customerName.trim()
        set({
          carts: get().carts.map((c) => {
            if (c.id !== cartId) return c
            if (c.status !== "open") return c
            return { ...c, customerName: nextName, updatedAt: now() }
          }),
        })
      },
      addItem: (cartId) => {
        const id = newId()
        const ts = now()
        set({
          carts: get().carts.map((c) => {
            if (c.id !== cartId) return c
            if (c.status !== "open") return c
            const item: CartItem = { id, name: "", quantity: 1, unitPrice: 0, createdAt: ts, updatedAt: ts }
            return { ...c, items: [...c.items, item], updatedAt: ts }
          }),
        })
        return id
      },
      updateItem: (cartId, itemId, patch) => {
        set({
          carts: get().carts.map((c) => {
            if (c.id !== cartId) return c
            if (c.status !== "open") return c
            const ts = now()
            return {
              ...c,
              updatedAt: ts,
              items: c.items.map((it) => {
                if (it.id !== itemId) return it
                const name = patch.name == null ? it.name : String(patch.name)
                const quantity = patch.quantity == null ? it.quantity : clampInt(Number(patch.quantity), 1)
                const unitPrice = patch.unitPrice == null ? it.unitPrice : clampMoney(Number(patch.unitPrice))
                return { ...it, name, quantity, unitPrice, updatedAt: ts }
              }),
            }
          }),
        })
      },
      removeItem: (cartId, itemId) => {
        set({
          carts: get().carts.map((c) => {
            if (c.id !== cartId) return c
            if (c.status !== "open") return c
            const ts = now()
            return { ...c, items: c.items.filter((it) => it.id !== itemId), updatedAt: ts }
          }),
        })
      },
      checkout: (cartId) => {
        set({
          carts: get().carts.map((c) => {
            if (c.id !== cartId) return c
            if (c.status !== "open") return c
            const ts = now()
            return { ...c, status: "checked_out", checkedOutAt: ts, updatedAt: ts }
          }),
        })
      },
    }),
    { name: "genok-carts" }
  )
)

