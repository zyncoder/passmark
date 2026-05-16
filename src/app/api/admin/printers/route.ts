import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let s = ""
  for (let i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
  return s + "!1Aa"
}

export async function POST(request: NextRequest) {
  const caller = await assertCaller(request.headers.get("Authorization"), "admin")
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const email = (body?.email ?? "").trim().toLowerCase()
  const eventId: string | null = body?.eventId ?? null
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (createErr) {
    return NextResponse.json(
      { error: createErr.message ?? "Failed to create user" },
      { status: 400 }
    )
  }
  if (!created.user) {
    return NextResponse.json({ error: "Create returned no user" }, { status: 500 })
  }

  const { error: insertErr } = await admin.from("printers").insert({
    id: created.user.id,
    username: email,
    event_id: eventId,
    is_active: true,
  })

  if (insertErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: created.user.id, tempPassword })
}
