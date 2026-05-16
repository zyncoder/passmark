import webpush from "web-push"
import { createAdminClient } from "./supabase-admin"

let configured = false

function configure() {
  if (configured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:ops@passmark.in"
  if (!pub || !priv) return // push disabled
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  configure()
  if (!configured) return { sent: 0, reason: "vapid-not-set" }

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId)

  if (!subs || subs.length === 0) return { sent: 0, reason: "no-subscriptions" }

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        JSON.stringify(payload)
      )
      sent++
    } catch (e) {
      const err = e as { statusCode?: number }
      // 410 Gone → subscription expired; clean it up.
      if (err.statusCode === 410 || err.statusCode === 404) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id)
      }
    }
  }
  return { sent }
}

export async function sendPushToRole(
  role: "admin" | "printer" | "guard",
  payload: PushPayload
) {
  configure()
  if (!configured) return { sent: 0, reason: "vapid-not-set" }
  const admin = createAdminClient()
  const table = role === "admin" ? "admins" : role === "printer" ? "printers" : "guards"
  const { data: ids } = await admin.from(table).select("id")
  if (!ids || ids.length === 0) return { sent: 0 }
  let sent = 0
  for (const r of ids) {
    const result = await sendPushToUser(r.id, payload)
    sent += result.sent
  }
  return { sent }
}
