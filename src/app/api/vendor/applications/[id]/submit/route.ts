import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { logActivity } from "@/lib/activity"

export const runtime = "nodejs"

/**
 * Server-side "finalise submission" endpoint used by the Background Sync
 * replay path. The draft must already exist; we simply flip its status to
 * SUBMITTED and stamp submitted_at. Idempotent: re-submitting a SUBMITTED
 * record is a no-op.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const { data: app } = await supabase
    .from("applications")
    .select("id, user_id, status, event_id, first_name, last_name")
    .eq("id", id)
    .single()

  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (app.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (app.status === "SUBMITTED" || app.status === "UNDER_REVIEW" || app.status === "APPROVED") {
    return NextResponse.json({ success: true, alreadyDone: true })
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    eventId: app.event_id,
    actorId: user.id,
    actorRole: "vendor",
    action: "FORM_SUBMITTED",
    subjectType: "application",
    subjectId: app.id,
    metadata: { applicant: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim() },
  })

  return NextResponse.json({ success: true })
}
