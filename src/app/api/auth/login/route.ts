import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { ipRateLimit, isLocked, recordFailure, recordSuccess } from "@/lib/auth-guard"

export const runtime = "nodejs"

/**
 * Auth gateway used by all four login pages. The page submits {email, password}
 * here; we enforce lockout + rate limit, then sign in via the Supabase server
 * client (so the auth cookies land on the response).
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"

  if (!ipRateLimit(ip, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const { email, password } = (await request.json().catch(() => ({}))) as {
    email?: string
    password?: string
  }
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }
  const normalisedEmail = email.trim().toLowerCase()

  const lock = await isLocked(normalisedEmail)
  if (lock.locked) {
    return NextResponse.json(
      { error: `Account locked until ${new Date(lock.until!).toLocaleTimeString("en-GB")}` },
      { status: 423 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: normalisedEmail,
    password,
  })
  if (error) {
    await recordFailure(normalisedEmail, ip)
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  await recordSuccess(normalisedEmail)
  return NextResponse.json({ success: true })
}
