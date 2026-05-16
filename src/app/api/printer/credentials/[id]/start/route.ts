import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "printer")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const admin = createAdminClient()

  const { data: cred } = await admin
    .from("credentials")
    .select("event_id, print_status, is_active")
    .eq("id", id)
    .single()
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!cred.is_active) return NextResponse.json({ error: "Credential revoked" }, { status: 409 })
  if (cred.print_status === "MAPPED") {
    return NextResponse.json({ error: "Already mapped" }, { status: 409 })
  }

  const { error } = await admin
    .from("credentials")
    .update({ print_status: "PRINTING" })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(admin, {
    eventId: cred.event_id,
    actorId: caller.userId,
    actorRole: "printer",
    action: "PRINT_STARTED",
    subjectType: "credential",
    subjectId: id,
  })

  return NextResponse.json({ success: true })
}
