import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { createClient } from "@/utils/supabase/server"

export const runtime = "nodejs"

/**
 * Issues a 1-hour signed URL for an application photo. Authenticated callers
 * only — admins/printers/guards/the vendor who owns the application.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const path: string | undefined = body?.path
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 })

  // Confirm the caller is at least one of the allowed roles, or the vendor
  // who owns the application this photo belongs to.
  const admin = createAdminClient()
  const [{ data: isAdmin }, { data: isPrinter }, { data: isGuard }] = await Promise.all([
    admin.from("admins").select("id").eq("id", user.id).maybeSingle(),
    admin.from("printers").select("id").eq("id", user.id).maybeSingle(),
    admin.from("guards").select("id").eq("id", user.id).maybeSingle(),
  ])

  let allowed = !!(isAdmin || isPrinter || isGuard)
  if (!allowed) {
    const { data: app } = await admin
      .from("applications")
      .select("user_id")
      .eq("photo_path", path)
      .maybeSingle()
    if (app?.user_id === user.id) allowed = true
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await admin.storage
    .from("application-photos")
    .createSignedUrl(path, 60 * 60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: data.signedUrl, expiresIn: 3600 })
}
