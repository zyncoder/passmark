import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json().catch(() => ({}))

  const updates: Record<string, unknown> = {}
  if (typeof body?.is_active === "boolean") updates.is_active = body.is_active
  if (typeof body?.event_id === "string" || body?.event_id === null) updates.event_id = body.event_id

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("printers").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const admin = createAdminClient()
  await admin.from("printers").delete().eq("id", id)
  await admin.auth.admin.deleteUser(id)
  return NextResponse.json({ success: true })
}
