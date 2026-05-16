"use client"

import * as React from "react"
import { Bell, BellOff } from "lucide-react"

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function PushOptIn() {
  const [status, setStatus] = React.useState<"unknown" | "subscribed" | "denied" | "default" | "unsupported">("unknown")
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  React.useEffect(() => {
    (async () => {
      if (typeof window === "undefined") return
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) setStatus("subscribed")
      else if (Notification.permission === "denied") setStatus("denied")
      else setStatus("default")
    })()
  }, [])

  const subscribe = async () => {
    if (!publicKey) return
    const reg = await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      setStatus("denied")
      return
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
    setStatus("subscribed")
  }

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      })
    }
    setStatus("default")
  }

  if (status === "unknown" || status === "unsupported" || !publicKey) return null

  if (status === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        className="inline-flex items-center gap-2 text-[13px] text-neutral-600 hover:text-neutral-900"
      >
        <BellOff className="w-4 h-4" /> Disable notifications
      </button>
    )
  }
  return (
    <button
      onClick={subscribe}
      className="inline-flex items-center gap-2 text-[13px] font-medium text-brand hover:text-brand-dark"
    >
      <Bell className="w-4 h-4" /> Enable notifications
    </button>
  )
}
