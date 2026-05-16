import { createAdminClient } from "./supabase-admin"

const MAX_FAILS = 5
const LOCK_MINUTES = 15
const WINDOW_MINUTES = 15

export async function isLocked(email: string): Promise<{ locked: boolean; until?: string }> {
  const admin = createAdminClient()
  const { data: lock } = await admin
    .from("account_locks")
    .select("locked_until")
    .eq("email", email)
    .maybeSingle()
  if (!lock) return { locked: false }
  if (new Date(lock.locked_until).getTime() > Date.now()) {
    return { locked: true, until: lock.locked_until }
  }
  // expired — clean it up lazily
  await admin.from("account_locks").delete().eq("email", email)
  return { locked: false }
}

export async function recordFailure(email: string, ip: string | null) {
  const admin = createAdminClient()
  await admin.from("failed_logins").insert({ email, ip })

  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count } = await admin
    .from("failed_logins")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("attempted_at", since)

  if ((count ?? 0) >= MAX_FAILS) {
    const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
    await admin.from("account_locks").upsert(
      { email, locked_until: lockedUntil, reason: `${count} failed attempts` },
      { onConflict: "email" }
    )
  }
}

export async function recordSuccess(email: string) {
  const admin = createAdminClient()
  await admin.from("failed_logins").delete().eq("email", email)
  await admin.from("account_locks").delete().eq("email", email)
}

/**
 * Simple in-memory IP rate limiter. Per-process; fine for single-region
 * Cloudflare Pages Functions but should be replaced with a KV-backed limiter
 * if scaled to multi-region.
 */
const ipBuckets = new Map<string, { count: number; resetAt: number }>()

export function ipRateLimit(ip: string, limit = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const entry = ipBuckets.get(ip)
  if (!entry || entry.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count++
  if (entry.count > limit) return false
  return true
}
