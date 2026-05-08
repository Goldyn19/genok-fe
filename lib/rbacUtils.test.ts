import { describe, expect, it } from "vitest"

import { getErrorMessage, parsePositiveInt } from "./rbacUtils"

describe("parsePositiveInt", () => {
  it("parses valid positive integers", () => {
    expect(parsePositiveInt("1")).toBe(1)
    expect(parsePositiveInt("42")).toBe(42)
    expect(parsePositiveInt("9.9")).toBe(9)
  })

  it("returns null for invalid values", () => {
    expect(parsePositiveInt(null)).toBeNull()
    expect(parsePositiveInt("")).toBeNull()
    expect(parsePositiveInt("0")).toBeNull()
    expect(parsePositiveInt("-2")).toBeNull()
    expect(parsePositiveInt("abc")).toBeNull()
  })
})

describe("getErrorMessage", () => {
  it("returns the message string when present", () => {
    expect(getErrorMessage({ message: "nope" }, "fallback")).toBe("nope")
  })

  it("falls back when message is missing", () => {
    expect(getErrorMessage({ other: true }, "fallback")).toBe("fallback")
  })
})
