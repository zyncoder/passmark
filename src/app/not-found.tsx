import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-6 text-center">
      <Logo size={40} className="mb-10" />
      
      <h1 className="text-8xl font-bold text-neutral-200 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-neutral-900 mb-3">Page not found</h2>
      <p className="text-neutral-500 max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>

      <div className="flex items-center gap-4">
        <Link href="/">
          <button className="h-11 px-6 rounded-xl bg-brand text-white font-semibold text-[14px] hover:bg-brand-dark transition-all shadow-sm">
            Back to Home
          </button>
        </Link>
        <Link href="/login">
          <button className="h-11 px-6 rounded-xl bg-white border border-neutral-200 text-neutral-700 font-semibold text-[14px] hover:border-neutral-300 transition-all">
            Go to Login
          </button>
        </Link>
      </div>
    </div>
  )
}
