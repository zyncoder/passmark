"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Camera, History, LogOut, MapPin } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { clearAll } from "@/lib/guard-db"

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isLogin = pathname === "/guard/login"

  if (isLogin) return children

  const handleLogout = async () => {
    await clearAll()
    await supabase.auth.signOut()
    router.push("/guard/login")
  }

  const tabs = [
    { name: "Scan", href: "/guard/scan", icon: Camera },
    { name: "Zone", href: "/guard/zone", icon: MapPin },
    { name: "Log", href: "/guard/log", icon: History },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-white">
      <main className="flex-1 flex flex-col">{children}</main>
      <nav className="sticky bottom-0 bg-neutral-950 border-t border-white/10 grid grid-cols-4 z-40">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href)
          return (
            <Link
              key={t.name}
              href={t.href}
              className={cn(
                "flex flex-col items-center justify-center py-3 text-[12px] font-medium gap-1",
                active ? "text-brand" : "text-white/60"
              )}
            >
              <t.icon className="w-5 h-5" />
              {t.name}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center py-3 text-[12px] font-medium gap-1 text-white/60"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </nav>
    </div>
  )
}
