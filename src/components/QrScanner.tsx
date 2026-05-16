"use client"

import * as React from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { DecodeHintType, BarcodeFormat } from "@zxing/library"

interface Props {
  onDecode: (text: string) => void
  onError?: (e: Error) => void
  active?: boolean
  className?: string
  preferredFacingMode?: "environment" | "user"
}

/**
 * Camera-driven QR reader. Mounts a <video> element and starts the decode
 * loop on mount. Calls `onDecode` for each successful decode.
 *
 * The caller decides what to do with each scan and should typically disable
 * `active` after the first successful read (or after a result modal is shown).
 */
export function QrScanner({
  onDecode,
  onError,
  active = true,
  className,
  preferredFacingMode = "environment",
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const controlsRef = React.useRef<{ stop: () => void } | null>(null)
  const [permissionDenied, setPermissionDenied] = React.useState(false)

  React.useEffect(() => {
    if (!active) return
    let cancelled = false

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
    const reader = new BrowserMultiFormatReader(hints)

    async function start() {
      try {
        const video = videoRef.current
        if (!video) return
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: preferredFacingMode } } },
          video,
          (result) => {
            if (cancelled) return
            if (result) onDecode(result.getText())
          }
        )
        controlsRef.current = controls
      } catch (e) {
        const err = e as { name?: string }
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionDenied(true)
        }
        onError?.(e as Error)
      }
    }
    start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [active, onDecode, onError, preferredFacingMode])

  return (
    <div className={className ?? "relative w-full aspect-square bg-black rounded-2xl overflow-hidden"}>
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-2/3 aspect-square border-2 border-white/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      {permissionDenied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-center text-white p-4 text-[14px]">
          Camera permission denied. Enable it in your browser settings and reload.
        </div>
      )}
    </div>
  )
}
