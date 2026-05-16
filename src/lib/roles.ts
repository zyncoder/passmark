import type { SupabaseClient } from "@supabase/supabase-js"

export type Role = "admin" | "vendor" | "printer" | "guard" | "unknown"

const DASHBOARD_FOR: Record<Role, string> = {
  admin: "/admin/dashboard",
  printer: "/printer/queue",
  guard: "/guard/scan",
  vendor: "/dashboard",
  unknown: "/login",
}

const LOGIN_FOR: Record<Role, string> = {
  admin: "/admin/login",
  printer: "/printer/login",
  guard: "/guard/login",
  vendor: "/login",
  unknown: "/login",
}

export function dashboardForRole(role: Role): string {
  return DASHBOARD_FOR[role] ?? "/login"
}

export function loginForRole(role: Role): string {
  return LOGIN_FOR[role] ?? "/login"
}

/**
 * Determine a user's role by checking the role tables in priority order.
 * Returns "unknown" if the user has no role row.
 */
export async function resolveRole(
  supabase: SupabaseClient,
  userId: string
): Promise<Role> {
  const [admin, printer, guard, vendor] = await Promise.all([
    supabase.from("admins").select("id").eq("id", userId).maybeSingle(),
    supabase.from("printers").select("id").eq("id", userId).maybeSingle(),
    supabase.from("guards").select("id").eq("id", userId).maybeSingle(),
    supabase.from("vendor_profiles").select("id").eq("id", userId).maybeSingle(),
  ])

  if (admin.data) return "admin"
  if (printer.data) return "printer"
  if (guard.data) return "guard"
  if (vendor.data) return "vendor"
  return "unknown"
}

export function isRoleRoute(
  pathname: string
): { scope: Role | "auth" | "public"; matched: boolean } {
  if (pathname.startsWith("/admin")) return { scope: "admin", matched: true }
  if (pathname.startsWith("/printer")) return { scope: "printer", matched: true }
  if (pathname.startsWith("/guard")) return { scope: "guard", matched: true }
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/form") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/register")
  ) {
    return { scope: "vendor", matched: true }
  }
  if (
    pathname === "/login" ||
    pathname === "/admin/login" ||
    pathname === "/printer/login" ||
    pathname === "/guard/login"
  ) {
    return { scope: "auth", matched: true }
  }
  return { scope: "public", matched: false }
}
