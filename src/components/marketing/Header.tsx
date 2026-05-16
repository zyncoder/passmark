import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-black flex items-center justify-center">
            <span className="text-white font-bold text-xs leading-none">P</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-neutral-900">Passmark</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-neutral-600">
          <a href="#features" className="hover:text-neutral-900 transition-colors">Products</a>
          <a href="#how-it-works" className="hover:text-neutral-900 transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-neutral-900 transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[14px] font-medium text-neutral-600 hover:text-neutral-900 px-4 py-2 rounded-full hover:bg-neutral-100 transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link href="/login">
            <Button className="rounded-full bg-black text-white hover:bg-neutral-800 px-6 font-medium">Contact</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
