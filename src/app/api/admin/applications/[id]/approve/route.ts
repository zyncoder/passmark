import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { mintCredentialQr } from "@/lib/qr"
import { logActivity } from "@/lib/activity"
import { sendPushToUser, sendPushToRole } from "@/lib/push"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: applicationId } = await ctx.params
  const supabase = createAdminClient()

  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("id, event_id, user_id, status, first_name, last_name, email")
    .eq("id", applicationId)
    .single()

  if (appErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  if (app.status === "APPROVED") {
    return NextResponse.json({ error: "Application already approved" }, { status: 409 })
  }
  if (!app.event_id) {
    return NextResponse.json(
      { error: "Application is not associated with an event" },
      { status: 400 }
    )
  }

  // 1) Flip application status
  const { error: updErr } = await supabase
    .from("applications")
    .update({
      status: "APPROVED",
      admin_remarks: null,
      decided_at: new Date().toISOString(),
      decided_by: caller.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // 2) Mint credential with HMAC-signed QR
  const credentialId = randomUUID()
  const ts = Date.now()
  let qr
  try {
    qr = await mintCredentialQr({
      credentialId,
      eventId: app.event_id,
      applicationId: app.id,
      ts,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `QR mint failed: ${e.message ?? e}` },
      { status: 500 }
    )
  }

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

  if (credErr) {
    return NextResponse.json(
      { error: `Credential mint failed: ${credErr.message}` },
      { status: 500 }
    )
  }

  // 3) Snapshot the application's requested zones onto the credential
  const { data: appZones } = await supabase
    .from("application_zones")
    .select("zone_id")
    .eq("application_id", app.id)

  if (appZones && appZones.length > 0) {
    const rows = appZones.map((z) => ({
      credential_id: credentialId,
      zone_id: z.zone_id,
    }))
    await supabase.from("credential_zones").insert(rows)
  }

  // 4) Activity events
  await logActivity(supabase, {
    eventId: app.event_id,
    actorId: caller.userId,
    actorRole: "admin",
    action: "FORM_APPROVED",
    subjectType: "application",
    subjectId: app.id,
    metadata: { applicant: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim() },
  })
  await logActivity(supabase, {
    eventId: app.event_id,
    actorId: caller.userId,
    actorRole: "admin",
    action: "CREDENTIAL_MINTED",
    subjectType: "credential",
    subjectId: credentialId,
    metadata: { applicationId: app.id },
  })

  // 5) Push notifications: vendor (form approved) and printers (new job)
  if (app.user_id) {
    await sendPushToUser(app.user_id, {
      title: "Application approved",
      body: `${app.first_name ?? "Your applicant"} has been approved for printing.`,
      url: "/dashboard",
    })
  }
  await sendPushToRole("printer", {
    title: "New print job",
    body: `${app.first_name ?? ""} ${app.last_name ?? ""} is in the queue.`.trim(),
    url: "/printer/queue",
  })

  return NextResponse.json({
    success: true,
    credentialId,
    qrDataUrl: qr.dataUrl,
  })
}
