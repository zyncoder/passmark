"use client"

import { createClient } from "@/utils/supabase/client"
import {
  drainOutbox,
  getMeta,
  removeOutboxEntries,
  replaceCredentials,
  replaceZones,
  setMeta,
  type CachedCredential,
} from "./guard-db"

export interface SyncResult {
  ok: boolean
  syncedAt?: string
  reason?: string
  credentials?: number
  assignedZones?: Array<{ id: string; name: string }>
}

export async function pullCredentialSync(): Promise<SyncResult> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, reason: "Not signed in" }

  const res = await fetch("/api/guard/sync", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  })
  if (!res.ok) {
    return { ok: false, reason: (await res.json().catch(() => ({})))?.error ?? "Sync failed" }
  }
  const payload = await res.json()

  type SyncCredential = {
    credentialId: string
    eventId: string
    applicationId: string
    applicantName: string
    designation: string | null
    photoUrl: string | null
    orgName: string | null
    zones: string[]
    serialNumber: string | null
    isActive: boolean
  }
  const cached: CachedCredential[] = (payload.credentials ?? []).map((c: SyncCredential) => ({
    credentialId: c.credentialId,
    eventId: c.eventId,
    applicationId: c.applicationId,
    applicantName: c.applicantName,
    designation: c.designation,
    photoUrl: c.photoUrl,
    orgName: c.orgName,
    zones: c.zones ?? [],
    serialNumber: c.serialNumber,
    isActive: c.isActive,
    syncedAt: Date.now(),
  }))
  await replaceCredentials(cached)
  await replaceZones(
    (payload.zones ?? []).map((z: { id: string; name: string }) => ({
      id: z.id,
      name: z.name,
      eventId: payload.eventId,
    }))
  )
  await setMeta("event_id", payload.eventId)
  await setMeta("assigned_zones", payload.assignedZones ?? [])
  await setMeta("synced_at", payload.syncedAt)

  return {
    ok: true,
    syncedAt: payload.syncedAt,
    credentials: cached.length,
    assignedZones: payload.assignedZones ?? [],
  }
}

export async function flushScanOutbox(): Promise<{ flushed: number; remaining: number; ok: boolean }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { flushed: 0, remaining: 0, ok: false }

  const all = await drainOutbox()
  if (all.length === 0) return { flushed: 0, remaining: 0, ok: true }

  const batch = all.slice(0, 200)
  const scans = batch.map((s) => ({
    credentialId: s.credentialId,
    zoneId: s.zoneId,
    zoneLabel: s.zoneLabel,
    outcome: s.outcome,
    reason: s.reason,
    scannedAt: s.scannedAt,
    deviceId: s.deviceId,
    rawPayload: s.rawPayload,
  }))

  const res = await fetch("/api/guard/scans", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ scans }),
  })
  if (!res.ok) {
    return { flushed: 0, remaining: all.length, ok: false }
  }
  const ids = batch.map((b) => b.id!).filter((x): x is number => typeof x === "number")
  await removeOutboxEntries(ids)
  return { flushed: batch.length, remaining: all.length - batch.length, ok: true }
}

export async function lastSyncTime(): Promise<number | null> {
  const v = await getMeta<string>("synced_at")
  return v ? new Date(v).getTime() : null
}

export async function requestBackgroundSync(tag: string) {
  if (typeof navigator === "undefined") return
  try {
    const reg = await navigator.serviceWorker?.ready
    const sync = (reg as unknown as { sync?: { register(tag: string): Promise<void> } })?.sync
    if (sync) await sync.register(tag)
  } catch {
    /* not supported */
  }
}
