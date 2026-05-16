import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { parseSignedToken, verifySignature } from "@/lib/qr"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "printer")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const scannedToken: string | undefined = body?.scannedToken
  if (!scannedToken) {
    return NextResponse.json({ error: "scannedToken required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: cred } = await admin
    .from("credentials")
    .select("id, event_id, application_id, qr_payload")
    .eq("id", id)
    .single()
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const parsed = parseSignedToken(scannedToken)
  if (!parsed.ok) return NextResponse.json({ error: parsed.reason }, { status: 400 })
  if (!verifySignature(parsed.raw, parsed.signature)) {
    return NextResponse.json({ error: "QR signature invalid" }, { status: 400 })
  }
  if (parsed.payload.credentialId !== id) {
    return NextResponse.json(
      { error: "Scanned QR does not match this job" },
      { status: 400 }
    )
  }

  const { error } = await admin
    .from("credentials")
    .update({
      print_status: "PRINTED",
      printed_at: new Date().toISOString(),
      printed_by: caller.userId,
    })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(admin, {
    eventId: cred.event_id,
    actorId: caller.userId,
    actorRole: "printer",
    action: "PRINT_COMPLETED",
    subjectType: "credential",
    subjectId: id,
    metadata: { applicationId: cred.application_id },
  })

  return NextResponse.json({ success: true })
}
