export type CartStatus = "open" | "checked_out"

export type CartItem = {
  id: string
  name: string
  quantity: number
  unitPrice: number
  createdAt: number
  updatedAt: number
}

export type Cart = {
  id: string
  customerName: string
  status: CartStatus
  checkedOutAt: number | null
  createdAt: number
  updatedAt: number
  items: CartItem[]
}

