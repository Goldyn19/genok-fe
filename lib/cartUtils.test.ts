import { describe, expect, it } from "vitest"

import { computeCartSubtotal, computeItemSubtotal, isCartCheckoutReady } from "./cartUtils"

describe("computeItemSubtotal", () => {
  it("computes qty * unit price", () => {
    expect(computeItemSubtotal({ quantity: 2, unitPrice: 3.5 })).toBe(7)
  })

  it("guards invalid values", () => {
    expect(computeItemSubtotal({ quantity: -1, unitPrice: 10 })).toBe(0)
    expect(computeItemSubtotal({ quantity: 2.9, unitPrice: -5 })).toBe(0)
    expect(computeItemSubtotal({ quantity: Number.NaN, unitPrice: 2 })).toBe(0)
  })
})

describe("computeCartSubtotal", () => {
  it("sums item subtotals", () => {
    expect(
      computeCartSubtotal({
        items: [
          { quantity: 2, unitPrice: 3 },
          { quantity: 1, unitPrice: 4.5 },
        ],
      })
    ).toBe(10.5)
  })
})

describe("isCartCheckoutReady", () => {
  it("requires open status and at least one valid item", () => {
    expect(isCartCheckoutReady({ status: "checked_out", items: [{ name: "A", quantity: 1, unitPrice: 1 }] })).toBe(false)
    expect(isCartCheckoutReady({ status: "open", items: [] })).toBe(false)
    expect(isCartCheckoutReady({ status: "open", items: [{ name: " ", quantity: 1, unitPrice: 1 }] })).toBe(false)
    expect(isCartCheckoutReady({ status: "open", items: [{ name: "A", quantity: 1, unitPrice: 0 }] })).toBe(true)
  })
})
