"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, FileCheck, IdCard, BarChart3, Settings, LogOut, Search, Bell } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"

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

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Applications", href: "/admin/applications", icon: FileCheck },
    { name: "Credentials", href: "/admin/credentials", icon: IdCard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  ]

  const generalItems = [
    { name: "Settings", href: "#", icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* ── Sidebar ── */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 justify-between">
        <div>
          <div className="p-6 pb-4">
            <Logo size={30} />
          </div>

          <div className="px-4">
            <p className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">Menu</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all",
                      isActive
                        ? "bg-brand text-white shadow-sm"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    )}
                  >
                    <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-white" : "text-neutral-400")} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="px-4 mt-8">
            <p className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">General</p>
            <nav className="space-y-1">
              {generalItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all"
                >
                  <item.icon className="w-[18px] h-[18px] text-neutral-400" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-[72px] px-8 bg-white border-b border-neutral-200">
          <div className="flex items-center gap-3 bg-neutral-100 rounded-xl px-4 py-2.5 w-80">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search applications, users..."
              className="bg-transparent text-[14px] w-full outline-none placeholder:text-neutral-400"
            />
            <span className="text-[11px] text-neutral-400 font-medium border border-neutral-200 rounded-md px-1.5 py-0.5 bg-white">⌘F</span>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative text-neutral-400 hover:text-neutral-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center">
                <span className="text-brand font-bold text-sm">{admin?.username?.charAt(0)?.toUpperCase() || "A"}</span>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-neutral-900">{admin?.username || "Admin"}</p>
                <p className="text-[11px] text-neutral-400">{admin?.role || "Super Admin"}</p>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
