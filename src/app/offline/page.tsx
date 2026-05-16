import Link from "next/link"

export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">You're offline</h1>
        <p className="text-[14px] text-neutral-600">
          Passmark needs a network connection for live data. Cached pages are
          still available, and any actions you take will sync when you reconnect.
        </p>
        <Link
          href="/"
          className="inline-block mt-2 text-[14px] font-semibold text-brand hover:underline"
        >
          Retry
        </Link>
      </div>
    </div>
  )
}
