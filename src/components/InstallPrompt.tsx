"use client"

import * as React from "react"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "passmark-install-dismissed-at"
const DISMISS_DAYS = 7

export function InstallPrompt({ context }: { context: "guard" | "vendor" | "default" }) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 86400_000) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const result = await deferred.userChoice
    if (result.outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    setDeferred(null)
    setVisible(false)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  const copy = context === "guard"
    ? "Install Passmark on your phone for fast on-site scanning, even offline."
    : "Install Passmark for one-tap access and offline support."

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white border border-neutral-200 shadow-lg rounded-2xl p-4 flex gap-3 items-start">
      <div className="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-neutral-900">Install Passmark</p>
        <p className="text-[13px] text-neutral-600 mt-0.5">{copy}</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="text-[13px] font-semibold text-white bg-brand px-3 py-1.5 rounded-lg hover:bg-brand-dark"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="text-[13px] font-medium text-neutral-600 px-3 py-1.5 rounded-lg hover:bg-neutral-100"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-neutral-400 hover:text-neutral-600 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
