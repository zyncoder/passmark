"use client"

import * as React from "react"

/**
 * Registers the service worker once on first client paint. Mounted from the
 * root layout so every role (incl. guard PWA install) gets the SW.
 */
export function PWARegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV === "development") {
      // Avoid stale dev caches; keep the SW active only in prod-style builds.
      // Comment this out if you want to test the SW in dev.
      return
    }
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((e) => console.warn("SW register failed", e))
    }
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })
  }, [])

  return null
}
