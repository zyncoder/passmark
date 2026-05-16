"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Printer as PrinterIcon, LogOut, ListChecks } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/logo"

export default function PrinterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [me, setMe] = React.useState<any>(null)

  const isLogin = pathname === "/printer/login"

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("printers").select("*").eq("id", user.id).maybeSingle()
      setMe(data)
    }
    load()
  }, [supabase])

  if (isLogin) return children

  // Hide chrome on print preview routes
  const isPrintRoute = pathname.startsWith("/printer/print/")

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/printer/login")
  }

  if (isPrintRoute) return <>{children}</>

  return (
    <div className="flex h-screen bg-neutral-50">
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 justify-between">
        <div>
          <div className="p-6 pb-4">
            <Logo size={30} />
          </div>
          <div className="px-4">
            <p className="px-3 mb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">Menu</p>
            <nav className="space-y-1">
              <Link
                href="/printer/queue"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all",
                  pathname.startsWith("/printer/queue")
                    ? "bg-brand text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <ListChecks className="w-[18px] h-[18px]" />
                Queue
              </Link>
              <Link
                href="/printer/history"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all",
                  pathname.startsWith("/printer/history")
                    ? "bg-brand text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <PrinterIcon className="w-[18px] h-[18px]" />
                History
              </Link>
            </nav>
          </div>
        </div>
        <div className="p-4 border-t border-neutral-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-[14px] font-semibold text-neutral-900 truncate">{me?.username || "Printer"}</p>
            <p className="text-[12px] text-neutral-400">Station</p>
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

      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  )
}
