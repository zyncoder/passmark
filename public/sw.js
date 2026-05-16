/* Passmark Service Worker
 * - App-shell + static asset caching for all roles
 * - Offline fallback page
 * - Background Sync for the vendor submission queue and the
 *   guard scan-log outbox (handled in app code via IndexedDB; the SW
 *   listens for "sync" events and pings clients to drain the queues).
 */

const VERSION = "passmark-sw-v1"
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`

const SHELL_ASSETS = [
  "/",
  "/login",
  "/admin/login",
  "/printer/login",
  "/guard/login",
  "/guard/scan",
  "/offline",
  "/manifest.webmanifest",
  "/logo.png",
  "/favicon.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // Use addAll with no-cache fetches so a stale CDN doesn't poison us.
      await Promise.all(
        SHELL_ASSETS.map(async (u) => {
          try {
            const res = await fetch(u, { cache: "no-cache" })
            if (res.ok) await cache.put(u, res.clone())
          } catch {
            /* network down at install — that's fine */
          }
        })
      )
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

function isHTMLRequest(req) {
  return (
    req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept")?.includes("text/html"))
  )
}

self.addEventListener("fetch", (event) => {
  const req = event.request

  if (req.method !== "GET") return

  // Never cache Supabase auth / storage / RPC — always go to network.
  const url = new URL(req.url)
  if (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.in")) return

  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(RUNTIME_CACHE)
          cache.put(req, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(req)
          if (cached) return cached
          return (await caches.match("/offline")) || Response.error()
        }
      })()
    )
    return
  }

  // Static asset: cache-first
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(RUNTIME_CACHE)
          cache.put(req, fresh.clone())
          return fresh
        } catch {
          return cached || Response.error()
        }
      })()
    )
  }
})

// ── Background Sync ──────────────────────────────────────────
// We don't drain queues directly here because outbox lives in
// IndexedDB owned by the client app; instead we wake the client.
self.addEventListener("sync", (event) => {
  if (event.tag === "passmark-scan-sync" || event.tag === "passmark-form-sync") {
    event.waitUntil(notifyClients({ type: "SYNC", tag: event.tag }))
  }
})

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const c of clients) c.postMessage(payload)
}

// ── Web Push ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Passmark", body: "" }
  try {
    if (event.data) data = event.data.json()
  } catch {
    if (event.data) data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Passmark", {
      body: data.body || "",
      icon: "/logo.png",
      badge: "/favicon.png",
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/"
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      for (const c of allClients) {
        if (c.url === targetUrl && "focus" in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })()
  )
})
