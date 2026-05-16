"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, FolderOpen, User, LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = React.useState<any>(null)

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('vendor_profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    loadUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Application", href: "/form/new", icon: FileText },
    { name: "My Profile", href: "/profile", icon: User },
  ]

  return (
    <div className="flex h-screen bg-neutral-50 flex-col sm:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden sm:flex flex-col w-64 bg-white border-r border-neutral-300 justify-between">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight text-brand">Passmark</h1>
          </div>
          <nav className="px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors",
                    isActive
                      ? "bg-brand-light text-brand"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-brand" : "text-neutral-600")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-neutral-300">
          <div className="px-3 py-2 mb-2">
            <p className="text-[14px] font-semibold text-neutral-900 truncate">
              {profile?.org_name || "Loading..."}
            </p>
            <p className="text-[12px] text-neutral-600 truncate">
              {profile?.designation || "Vendor"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-16 sm:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-300 z-50">
        <nav className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  isActive ? "text-brand" : "text-neutral-600"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
