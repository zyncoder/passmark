import { NextRequest, NextResponse } from "next/server"
import { assertCaller, createAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"

interface VendorRow {
  org_name: string
  coordinator_name?: string
  email: string
  designation?: string
  quota?: number
}

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
  const rows: VendorRow[] = Array.isArray(body?.rows) ? body.rows : []

  if (rows.length === 0) {
    return NextResponse.json({ error: "rows[] required" }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Max 500 rows per import" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: activeEvent } = await admin
    .from("events")
    .select("id")
    .eq("is_active", true)
    .maybeSingle()

  const results: Array<{ email: string; status: "created" | "exists" | "error"; reason?: string; tempPassword?: string }> = []

  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase()
    const org = (row.org_name ?? "").trim()
    if (!email || !org) {
      results.push({ email, status: "error", reason: "email and org_name required" })
      continue
    }

    const tempPassword = generateTempPassword()
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        results.push({ email, status: "exists" })
      } else {
        results.push({ email, status: "error", reason: createErr.message })
      }
      continue
    }

    if (!created.user) {
      results.push({ email, status: "error", reason: "create returned no user" })
      continue
    }

    const { error: profileErr } = await admin.from("vendor_profiles").insert({
      id: created.user.id,
      username: email,
      org_name: org,
      designation: row.designation ?? null,
      quota: row.quota ?? 5,
      event_id: activeEvent?.id ?? null,
      is_active: true,
      is_registered: false,
    })

    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      results.push({ email, status: "error", reason: profileErr.message })
      continue
    }

    results.push({ email, status: "created", tempPassword })
  }

  return NextResponse.json({
    success: true,
    counts: {
      created: results.filter((r) => r.status === "created").length,
      exists: results.filter((r) => r.status === "exists").length,
      error: results.filter((r) => r.status === "error").length,
    },
    results,
  })
}
