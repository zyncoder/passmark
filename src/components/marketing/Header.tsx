"use client"

import * as React from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Header() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link href="/">
          <Logo size={28} />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-neutral-500">
          <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-neutral-900 transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-neutral-900 transition-colors">Pricing</a>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-[14px] font-medium text-neutral-500 hover:text-neutral-900 px-4 py-2 rounded-xl hover:bg-neutral-100 transition-all">
            Sign in
          </Link>
          <Link href="/login">
            <Button className="rounded-xl">Get Started</Button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-neutral-100 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5 text-neutral-700" /> : <Menu className="w-5 h-5 text-neutral-700" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-100 px-6 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <a href="#features" onClick={() => setMobileOpen(false)} className="block py-2 text-[15px] font-medium text-neutral-700 hover:text-brand transition-colors">Features</a>
          <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block py-2 text-[15px] font-medium text-neutral-700 hover:text-brand transition-colors">How it Works</a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} className="block py-2 text-[15px] font-medium text-neutral-700 hover:text-brand transition-colors">Pricing</a>
          <hr className="border-neutral-100" />
          <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-[15px] font-medium text-neutral-700">Sign in</Link>
          <Link href="/login" onClick={() => setMobileOpen(false)}>
            <Button className="w-full rounded-xl mt-2">Get Started</Button>
          </Link>
        </div>
      )}
    </header>
  )
}
