import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

interface Incoming {
  credentialId: string | null
  zoneId: string
  zoneLabel: string
  outcome: "ALLOW" | "DENY_ZONE" | "DENY_REVOKED" | "DENY_INVALID" | "ALREADY_SCANNED"
  reason?: string | null
  scannedAt: string
  deviceId?: string | null
  rawPayload?: string | null
}

/**
 * Sync an outbox of offline scans (or accept a single online scan) from the
 * Guard app. We trust the guard_id from the auth token; the client supplies
 * everything else.
 */
export async function POST(request: NextRequest) {
  const caller = await assertCaller(request.headers.get("Authorization"), "guard")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const scans: Incoming[] = Array.isArray(body?.scans) ? body.scans : []
  if (scans.length === 0) {
    return NextResponse.json({ error: "scans[] required" }, { status: 400 })
  }
  if (scans.length > 500) {
    return NextResponse.json({ error: "Max 500 per batch" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: guard } = await admin
    .from("guards")
    .select("event_id")
    .eq("id", caller.userId)
    .single()

  const rows = scans.map((s) => ({
    credential_id: s.credentialId,
    guard_id: caller.userId,
    event_id: guard?.event_id ?? null,
    zone_id: s.zoneId || null,
    zone_label: s.zoneLabel,
    outcome: s.outcome,
    reason: s.reason ?? null,
    scanned_at: s.scannedAt,
    synced_at: new Date().toISOString(),
    device_id: s.deviceId ?? null,
    raw_payload: s.rawPayload ?? null,
  }))

  const { error } = await admin.from("scan_logs").insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // One activity entry per non-allow scan (allow scans are routine; logging
  // every one would flood the feed).
  for (const s of scans) {
    if (s.outcome === "ALLOW") continue
    await logActivity(admin, {
      eventId: guard?.event_id,
      actorId: caller.userId,
      actorRole: "guard",
      action: s.outcome === "ALREADY_SCANNED" ? "SCAN_ANOMALY" : "SCAN_DENY",
      subjectType: "credential",
      subjectId: s.credentialId,
      metadata: { reason: s.reason, zone: s.zoneLabel, outcome: s.outcome },
    })
  }

  return NextResponse.json({ success: true, accepted: rows.length })
}

/**
 * Guard's own scan log (server view, for the post-event report).
 */
export async function GET(request: NextRequest) {
  const caller = await assertCaller(request.headers.get("Authorization"), "guard")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 100))
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("scan_logs")
    .select(`
      id, scanned_at, outcome, zone_label, reason,
      credentials ( serial_number, applications ( first_name, last_name ) )
    `)
    .eq("guard_id", caller.userId)
    .order("scanned_at", { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scans: data ?? [] })
}
