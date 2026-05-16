import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"
import { logActivity } from "@/lib/activity"
import { sendPushToUser } from "@/lib/push"

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
    return NextResponse.json({ error: "Remarks are required to reject" }, { status: 400 })
  }

  const { id: applicationId } = await ctx.params
  const supabase = createAdminClient()

  const { data: app } = await supabase
    .from("applications")
    .select("id, event_id, user_id, first_name")
    .eq("id", applicationId)
    .single()

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const { error } = await supabase
    .from("applications")
    .update({
      status: "REJECTED",
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
    action: "FORM_REJECTED",
    subjectType: "application",
    subjectId: app.id,
    metadata: { remarks },
  })

  if (app.user_id) {
    await sendPushToUser(app.user_id, {
      title: "Application rejected",
      body: remarks.length > 120 ? `${remarks.slice(0, 117)}...` : remarks,
      url: "/dashboard",
    })
  }

  return NextResponse.json({ success: true })
}
