export function parsePositiveInt(value: string | null) {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const i = Math.floor(n)
  return i > 0 ? i : null
}

export function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err != null && "message" in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === "string") return message
    return String(message)
  }
  return fallback
}

