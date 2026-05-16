import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { logActivity } from "@/lib/activity"
import { sendPushToRole } from "@/lib/push"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const reason = (body?.reason ?? "").trim() || null

  const { id: credentialId } = await ctx.params
  const supabase = createAdminClient()

  const { data: cred } = await supabase
    .from("credentials")
    .select("id, event_id, is_active")
    .eq("id", credentialId)
    .single()

  if (!cred) return NextResponse.json({ error: "Credential not found" }, { status: 404 })
  if (!cred.is_active) {
    return NextResponse.json({ error: "Credential already invalidated" }, { status: 409 })
  }

  const { error } = await supabase
    .from("credentials")
    .update({
      is_active: false,
      invalidated_at: new Date().toISOString(),
      invalidation_reason: reason,
    })
    .eq("id", credentialId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    eventId: cred.event_id,
    actorId: caller.userId,
    actorRole: "admin",
    action: "CREDENTIAL_INVALIDATED",
    subjectType: "credential",
    subjectId: credentialId,
    metadata: { reason },
  })

  // Tell all active guards to refresh their cache so the revocation propagates fast.
  await sendPushToRole("guard", {
    title: "Credential revoked",
    body: "Sync now — at least one credential was revoked.",
    url: "/guard/zone",
  })

  return NextResponse.json({ success: true })
}
