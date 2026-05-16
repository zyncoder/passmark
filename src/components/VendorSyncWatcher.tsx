"use client"

import * as React from "react"
import { clearPending, listPending } from "@/lib/vendor-outbox"
import { useToast } from "@/hooks/use-toast"

/**
 * Drains the vendor submission outbox whenever the browser comes back online
 * or the service worker fires a passmark-form-sync event. Mounted inside the
 * vendor layout.
 */
export function VendorSyncWatcher() {
  const { addToast } = useToast()

  const flush = React.useCallback(async () => {
    if (typeof window === "undefined") return
    if (!navigator.onLine) return
    const pending = await listPending()
    if (pending.length === 0) return

    const flushed: number[] = []
    for (const p of pending) {
      try {
        const res = await fetch(`/api/vendor/applications/${p.applicationId}/submit`, {
          method: "POST",
        })
        if (res.ok) flushed.push(p.id!)
      } catch {
        /* still offline, leave queued */
      }
    }
    if (flushed.length > 0) {
      await clearPending(flushed)
      addToast(`Synced ${flushed.length} queued submission${flushed.length > 1 ? "s" : ""}.`, "success")
    }
  }, [addToast])

  React.useEffect(() => {
    flush()
    const onOnline = () => flush()
    window.addEventListener("online", onOnline)

    const onMsg = (event: MessageEvent) => {
      if (event.data?.type === "SYNC" && event.data.tag === "passmark-form-sync") flush()
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onMsg)
    }

    return () => {
      window.removeEventListener("online", onOnline)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onMsg)
      }
    }
  }, [flush])

  return null
}
