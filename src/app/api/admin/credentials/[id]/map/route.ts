import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { logActivity } from "@/lib/activity"
import { parseSignedToken, verifySignature } from "@/lib/qr"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const serial = (body?.serial ?? "").trim()
  const scannedToken: string | undefined = body?.scannedToken

  if (!serial) return NextResponse.json({ error: "Serial number required" }, { status: 400 })

  const { id: credentialId } = await ctx.params
  const supabase = createAdminClient()

  const { data: cred } = await supabase
    .from("credentials")
    .select("id, event_id, application_id, print_status, qr_payload, qr_signature")
    .eq("id", credentialId)
    .single()

  if (!cred) return NextResponse.json({ error: "Credential not found" }, { status: 404 })

  // If admin scanned the printed QR, verify it matches THIS credential.
  if (scannedToken) {
    const parsed = parseSignedToken(scannedToken)
    if (!parsed.ok) {
      return NextResponse.json({ error: `QR token malformed: ${parsed.reason}` }, { status: 400 })
    }
    if (!verifySignature(parsed.raw, parsed.signature)) {
      return NextResponse.json({ error: "QR signature invalid" }, { status: 400 })
    }
    if (parsed.payload.credentialId !== credentialId) {
      return NextResponse.json(
        { error: "Scanned QR does not match this credential" },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase
    .from("credentials")
    .update({
      serial_number: serial,
      mapped_at: new Date().toISOString(),
      mapped_by: caller.userId,
      print_status: "MAPPED",
    })
    .eq("id", credentialId)

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Serial number already in use" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity(supabase, {
    eventId: cred.event_id,
    actorId: caller.userId,
    actorRole: "admin",
    action: "QR_MAPPED",
    subjectType: "credential",
    subjectId: credentialId,
    metadata: { serial, applicationId: cred.application_id },
  })

  return NextResponse.json({ success: true })
}
