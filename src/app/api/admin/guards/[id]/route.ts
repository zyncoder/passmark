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
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (typeof body?.is_active === "boolean") updates.is_active = body.is_active
  if (typeof body?.event_id === "string" || body?.event_id === null) updates.event_id = body.event_id

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("guards").update(updates).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Array.isArray(body?.zoneIds)) {
    await admin.from("guard_zones").delete().eq("guard_id", id)
    if (body.zoneIds.length > 0) {
      await admin
        .from("guard_zones")
        .insert(body.zoneIds.map((zid: string) => ({ guard_id: id, zone_id: zid })))
    }
  }

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
  await admin.from("guard_zones").delete().eq("guard_id", id)
  await admin.from("guards").delete().eq("id", id)
  await admin.auth.admin.deleteUser(id)
  return NextResponse.json({ success: true })
}
