"use client"

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { SessionProvider, signOut, useSession } from "next-auth/react"

const IDLE_MS = 60 * 60 * 1000
const CHECK_MS = 15 * 1000
const LAST_ACTIVITY_KEY = "genok_last_activity_at"

function SessionIdleLogout() {
  const { data: session, status } = useSession()
  const statusRef = useRef(status)
  statusRef.current = status

  const idleTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return

    const readLast = () => {
      const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
      const n = raw ? Number(raw) : NaN
      return Number.isFinite(n) ? n : Date.now()
    }

    const writeNow = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) writeNow()

    const onActivity = () => {
      if (statusRef.current !== "authenticated") return
      writeNow()
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_ACTIVITY_KEY) return
    }

    const events: Array<keyof WindowEventMap> = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"]
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true })
    window.addEventListener("focus", onActivity)
    window.addEventListener("storage", onStorage)

    idleTimerRef.current = window.setInterval(() => {
      if (statusRef.current !== "authenticated") return
      const last = readLast()
      if (Date.now() - last > IDLE_MS) {
        signOut({ callbackUrl: "/login" })
      }
    }, CHECK_MS)

    return () => {
      if (idleTimerRef.current != null) {
        window.clearInterval(idleTimerRef.current)
        idleTimerRef.current = null
      }
      for (const ev of events) window.removeEventListener(ev, onActivity)
      window.removeEventListener("focus", onActivity)
      window.removeEventListener("storage", onStorage)
    }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") return
    if (session?.error) {
      signOut({ callbackUrl: "/login" })
    }
  }, [session?.error, status])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      <SessionIdleLogout />
      {children}
    </SessionProvider>
  )
}
