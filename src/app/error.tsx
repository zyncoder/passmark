"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <span className="text-3xl">⚠️</span>
      </div>
      
      <h2 className="text-2xl font-bold text-neutral-900 mb-3">Something went wrong</h2>
      <p className="text-neutral-500 max-w-md mb-8">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>

      <button
        onClick={() => reset()}
        className="h-11 px-6 rounded-xl bg-brand text-white font-semibold text-[14px] hover:bg-brand-dark transition-all shadow-sm"
      >
        Try Again
      </button>
    </div>
  )
}
