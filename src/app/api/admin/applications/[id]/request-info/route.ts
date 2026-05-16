import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const remarks = (body?.remarks ?? "").trim()
  if (!remarks) {
    return NextResponse.json({ error: "Remarks are required" }, { status: 400 })
  }

  const { id: applicationId } = await ctx.params
  const supabase = createAdminClient()

  const { data: app } = await supabase
    .from("applications")
    .select("id, event_id")
    .eq("id", applicationId)
    .single()

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const { error } = await supabase
    .from("applications")
    .update({
      status: "DRAFT",
      admin_remarks: remarks,
      decided_at: new Date().toISOString(),
      decided_by: caller.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    eventId: app.event_id,
    actorId: caller.userId,
    actorRole: "admin",
    action: "FORM_REOPENED",
    subjectType: "application",
    subjectId: app.id,
    metadata: { remarks },
  })

  return NextResponse.json({ success: true })
}
