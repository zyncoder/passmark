import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { dashboardForRole, isRoleRoute, resolveRole, type Role } from '@/lib/roles'

const ROLE_COOKIE = 'passmark.role'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Skip API and static assets entirely. Internal _next routes already filtered
  // by config matcher.
  if (pathname.startsWith('/api') || pathname.startsWith('/sw.js')) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()
  const route = isRoleRoute(pathname)

  // ── Not authenticated ─────────────────────────────────────
  if (!user) {
    if (route.scope === 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (route.scope === 'printer') {
      return NextResponse.redirect(new URL('/printer/login', request.url))
    }
    if (route.scope === 'guard') {
      return NextResponse.redirect(new URL('/guard/login', request.url))
    }
    if (route.scope === 'vendor') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // ── Authenticated ─────────────────────────────────────────
  // Try the cookie-cached role first to avoid 4x DB lookups per request.
  let role: Role | null = null
  const cached = request.cookies.get(ROLE_COOKIE)?.value as Role | undefined
  if (cached && ['admin', 'printer', 'guard', 'vendor'].includes(cached)) {
    role = cached
  } else {
    role = await resolveRole(supabase, user.id)
    if (role !== 'unknown') {
      supabaseResponse.cookies.set(ROLE_COOKIE, role, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 30, // 30 min — re-verified by middleware after expiry
      })
    }
  }

  // Logged-in user on an auth/login route → bounce to their dashboard.
  if (route.scope === 'auth' || pathname === '/login' || pathname === '/admin/login' || pathname === '/printer/login' || pathname === '/guard/login') {
    if (role && role !== 'unknown') {
      return NextResponse.redirect(new URL(dashboardForRole(role), request.url))
    }
    return supabaseResponse
  }

  // Block role-scoped pages for the wrong role.
  if (route.scope === 'admin' && role !== 'admin') {
    return NextResponse.redirect(new URL(role ? dashboardForRole(role) : '/login', request.url))
  }
  if (route.scope === 'printer' && role !== 'printer') {
    return NextResponse.redirect(new URL(role ? dashboardForRole(role) : '/login', request.url))
  }
  if (route.scope === 'guard' && role !== 'guard') {
    return NextResponse.redirect(new URL(role ? dashboardForRole(role) : '/login', request.url))
  }
  if (route.scope === 'vendor' && role !== 'vendor') {
    return NextResponse.redirect(new URL(role ? dashboardForRole(role) : '/login', request.url))
  }

  return supabaseResponse
}
