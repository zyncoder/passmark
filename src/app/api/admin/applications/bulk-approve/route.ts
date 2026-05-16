import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { mintCredentialQr } from "@/lib/qr"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids[] required" }, { status: 400 })
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Max 200 applications per bulk-approve" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: apps, error: fetchErr } = await supabase
    .from("applications")
    .select("id, event_id, status")
    .in("id", ids)

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  const candidates = (apps ?? []).filter((a) => a.status !== "APPROVED" && a.event_id)

  const results: Array<{ applicationId: string; credentialId?: string; error?: string }> = []

  for (const app of candidates) {
    const credentialId = randomUUID()
    try {
      const qr = await mintCredentialQr({
        credentialId,
        eventId: app.event_id!,
        applicationId: app.id,
        ts: Date.now(),
      })

      const { error: credErr } = await supabase.from("credentials").insert({
        id: credentialId,
        event_id: app.event_id,
        application_id: app.id,
        qr_payload: qr.payload,
        qr_signature: qr.signature,
        qr_data_url: qr.dataUrl,
        print_status: "PENDING",
        is_active: true,
      })

      if (credErr) throw new Error(credErr.message)

      await supabase
        .from("applications")
        .update({
          status: "APPROVED",
          decided_at: new Date().toISOString(),
          decided_by: caller.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.id)

      const { data: appZones } = await supabase
        .from("application_zones")
        .select("zone_id")
        .eq("application_id", app.id)

      if (appZones && appZones.length > 0) {
        await supabase
          .from("credential_zones")
          .insert(appZones.map((z) => ({ credential_id: credentialId, zone_id: z.zone_id })))
      }

      await logActivity(supabase, {
        eventId: app.event_id,
        actorId: caller.userId,
        actorRole: "admin",
        action: "FORM_APPROVED",
        subjectType: "application",
        subjectId: app.id,
        metadata: { bulk: true },
      })
      await logActivity(supabase, {
        eventId: app.event_id,
        actorId: caller.userId,
        actorRole: "admin",
        action: "CREDENTIAL_MINTED",
        subjectType: "credential",
        subjectId: credentialId,
        metadata: { bulk: true },
      })

      results.push({ applicationId: app.id, credentialId })
    } catch (e: any) {
      results.push({ applicationId: app.id, error: e?.message ?? String(e) })
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    skipped: ids.length - candidates.length,
    results,
  })
}
