import { createClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase client that bypasses RLS using the service role key.
 * NEVER import this from a client component or route file that ships to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase admin client misconfigured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Verify the caller of a route handler is the user matching `requiredRole`.
 * Returns the user record on success or null on failure (caller should 401/403).
 */
export async function assertCaller(
  authHeader: string | null,
  requiredRole: "admin" | "printer" | "guard" | "any"
): Promise<{ userId: string; email: string | null } | null> {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, "")
  if (!token) return null
  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null

  if (requiredRole === "any") return { userId: user.id, email: user.email ?? null }

  const table =
    requiredRole === "admin" ? "admins" :
    requiredRole === "printer" ? "printers" :
    "guards"

  const { data: roleRow } = await admin.from(table).select("id").eq("id", user.id).maybeSingle()
  if (!roleRow) return null
  return { userId: user.id, email: user.email ?? null }
}
