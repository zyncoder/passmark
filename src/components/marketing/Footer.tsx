import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-neutral-950 text-neutral-400 py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
              <span className="text-neutral-900 font-bold text-xs leading-none">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Passmark</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-neutral-500 mb-8">
            The modern accreditation platform for event organizers. Issue vendor passes, manage media approvals, and streamline security — all in one place.
          </p>
          <div className="text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} Passmark Platform. All rights reserved.
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium text-sm mb-5">Product</h4>
          <ul className="space-y-3 text-sm">
            <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
            <li><Link href="/login" className="hover:text-white transition-colors">Vendor Login</Link></li>
            <li><Link href="/admin/login" className="hover:text-white transition-colors">Admin Portal</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-medium text-sm mb-5">Company</h4>
          <ul className="space-y-3 text-sm">
            <li><a href="#" className="hover:text-white transition-colors">About</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
