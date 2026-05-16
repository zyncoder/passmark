"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, User, LogOut, Settings, HelpCircle, Search, Bell } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"
import { VendorSyncWatcher } from "@/components/VendorSyncWatcher"
import { InstallPrompt } from "@/components/InstallPrompt"

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

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New Application", href: "/form/new", icon: FileText },
  ]

  const generalItems = [
    { name: "My Profile", href: "/profile", icon: User },
    { name: "Settings", href: "#", icon: Settings },
    { name: "Help", href: "#", icon: HelpCircle },
  ]

  return (
    <div className="flex h-screen bg-neutral-50 flex-col sm:flex-row">
      {/* ── Desktop Sidebar ── */}
      <div className="hidden sm:flex flex-col w-64 bg-white border-r border-neutral-200 justify-between">
        <div>
          {/* Logo */}
          <div className="p-6 pb-4">
            <Logo size={30} />
          </div>

          {/* Menu Section */}
          <div className="px-4">
            <p className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">Menu</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
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

          {/* General Section */}
          <div className="px-4 mt-8">
            <p className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">General</p>
            <nav className="space-y-1">
              {generalItems.map((item) => {
                const isActive = pathname === item.href
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
        </div>

        {/* Bottom: Logout */}
        <div className="p-4 border-t border-neutral-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-[14px] font-semibold text-neutral-900 truncate">
              {profile?.org_name || "Loading..."}
            </p>
            <p className="text-[12px] text-neutral-400 truncate">
              {profile?.designation || "Vendor"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </div>

      {/* ── Top Bar (desktop) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="hidden sm:flex items-center justify-between h-[72px] px-8 bg-white border-b border-neutral-200">
          <div className="flex items-center gap-3 bg-neutral-100 rounded-xl px-4 py-2.5 w-80">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search applications..."
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
                <span className="text-brand font-bold text-sm">{profile?.org_name?.charAt(0) || "?"}</span>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-neutral-900">{profile?.org_name || "..."}</p>
                <p className="text-[11px] text-neutral-400">{profile?.username || ""}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 overflow-auto pb-16 sm:pb-0">
          {children}
        </div>
      </div>

      <VendorSyncWatcher />
      <InstallPrompt context="vendor" />

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-50">
        <nav className="flex justify-around items-center p-2">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                  isActive ? "text-brand" : "text-neutral-400"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-neutral-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
