"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [admin, setAdmin] = React.useState<any>(null)

  const isLoginPage = pathname === '/admin/login'

  React.useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Admin validation
        const { data } = await supabase.from('admins').select('*').eq('id', user.id).single()
        if (data) {
          setAdmin(data)
        } else if (!isLoginPage) {
          router.push('/login') // fallback to vendor login if not admin
        }
      }
    }
    loadAdmin()
  }, [supabase, isLoginPage, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (isLoginPage) return children

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard" },
    { name: "Users", href: "/admin/users" },
    { name: "Applications", href: "/admin/applications" },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold tracking-tight text-brand">Passmark Admin</h1>
              <nav className="hidden md:flex space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      pathname.startsWith(item.href)
                        ? "bg-brand-light text-brand"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-neutral-900 hidden sm:block">
                {admin?.username || "Admin"}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
