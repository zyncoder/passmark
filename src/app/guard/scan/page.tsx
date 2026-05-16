"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { QrScanner } from "@/components/QrScanner"
import {
  enqueueScan,
  getCredential,
  getLocalScan,
  getMeta,
  markScanned,
  type ScanOutcome,
} from "@/lib/guard-db"
import { flushScanOutbox, pullCredentialSync, requestBackgroundSync } from "@/lib/guard-sync"

interface ScanResult {
  outcome: ScanOutcome
  applicantName?: string
  org?: string
  designation?: string
  photoUrl?: string | null
  reason?: string
  firstScannedAt?: string
}

const RESULT_DISPLAY_MS = 2500

function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr"
  let v = localStorage.getItem("passmark-device-id")
  if (!v) {
    v = `${navigator.platform || "web"}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem("passmark-device-id", v)
  }
  return v
}

function playTone(kind: "allow" | "deny" | "warn") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (kind === "allow") {
      osc.frequency.value = 880
      osc.type = "sine"
      gain.gain.value = 0.12
      osc.start()
      setTimeout(() => { osc.frequency.value = 1320 }, 70)
      setTimeout(() => { osc.stop(); ctx.close() }, 220)
    } else if (kind === "deny") {
      osc.frequency.value = 220
      osc.type = "square"
      gain.gain.value = 0.16
      osc.start()
      setTimeout(() => { osc.stop(); ctx.close() }, 380)
    } else {
      osc.frequency.value = 520
      osc.type = "triangle"
      gain.gain.value = 0.14
      osc.start()
      setTimeout(() => { osc.frequency.value = 360 }, 90)
      setTimeout(() => { osc.stop(); ctx.close() }, 320)
    }
  } catch {
    /* audio disabled */
  }
}

export default function GuardScanPage() {
  const supabase = createClient()
  const router = useRouter()
  const [activeZone, setActiveZone] = React.useState<{ id: string; name: string } | null>(null)
  const [result, setResult] = React.useState<ScanResult | null>(null)
  const [online, setOnline] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const cooldownRef = React.useRef(false)

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  React.useEffect(() => {
    (async () => {
      const zoneId = await getMeta<string>("active_zone_id")
      const zoneName = await getMeta<string>("active_zone_name")
      if (!zoneId || !zoneName) {
        router.replace("/guard/zone")
        return
      }
      setActiveZone({ id: zoneId, name: zoneName })
    })()
  }, [router])

  // Auto-flush outbox whenever we come back online.
  React.useEffect(() => {
    if (!online) return
    flushScanOutbox().catch(() => {})
  }, [online])

  // Listen for service-worker prompts to flush.
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC") {
        flushScanOutbox().catch(() => {})
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])

  const handleScan = React.useCallback(
    async (rawText: string) => {
      if (!activeZone) return
      if (cooldownRef.current) return
      cooldownRef.current = true
      setTimeout(() => { cooldownRef.current = false }, 1200)

      const idx = rawText.lastIndexOf(".")
      const payload = idx > 0 ? rawText.slice(0, idx) : rawText
      const parts = payload.split("|")
      const credentialId = parts[0]

      let res: ScanResult
      let outcome: ScanOutcome = "DENY_INVALID"
      let credId: string | null = null

      if (!credentialId) {
        res = { outcome: "DENY_INVALID", reason: "Unrecognised QR" }
      } else {
        const cached = await getCredential(credentialId)
        if (!cached) {
          res = { outcome: "DENY_INVALID", reason: "Unknown credential. Try Sync." }
        } else if (!cached.isActive) {
          credId = cached.credentialId
          res = {
            outcome: "DENY_REVOKED",
            applicantName: cached.applicantName,
            org: cached.orgName ?? undefined,
            designation: cached.designation ?? undefined,
            photoUrl: cached.photoUrl,
            reason: "Credential revoked",
          }
        } else if (!cached.zones.includes(activeZone.id)) {
          credId = cached.credentialId
          res = {
            outcome: "DENY_ZONE",
            applicantName: cached.applicantName,
            org: cached.orgName ?? undefined,
            designation: cached.designation ?? undefined,
            photoUrl: cached.photoUrl,
            reason: `${activeZone.name} not in credential`,
          }
        } else {
          const prior = await getLocalScan(cached.credentialId)
          if (prior && prior.zoneId === activeZone.id) {
            credId = cached.credentialId
            res = {
              outcome: "ALREADY_SCANNED",
              applicantName: cached.applicantName,
              org: cached.orgName ?? undefined,
              designation: cached.designation ?? undefined,
              photoUrl: cached.photoUrl,
              reason: "Already scanned",
              firstScannedAt: prior.scannedAt,
            }
          } else {
            credId = cached.credentialId
            res = {
              outcome: "ALLOW",
              applicantName: cached.applicantName,
              org: cached.orgName ?? undefined,
              designation: cached.designation ?? undefined,
              photoUrl: cached.photoUrl,
            }
            await markScanned(cached.credentialId, activeZone.id)
          }
        }
      }

      outcome = res.outcome
      setResult(res)

      if (outcome === "ALLOW") playTone("allow")
      else if (outcome === "ALREADY_SCANNED") playTone("warn")
      else playTone("deny")

      // Persist + try to sync
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await enqueueScan({
          credentialId: credId,
          guardId: user.id,
          eventId: (await getMeta<string>("event_id")) ?? "",
          zoneId: activeZone.id,
          zoneLabel: activeZone.name,
          outcome,
          reason: res.reason ?? null,
          scannedAt: new Date().toISOString(),
          deviceId: getDeviceId(),
          rawPayload: rawText,
        })
      }
      if (navigator.onLine) {
        flushScanOutbox().catch(() => {})
      } else {
        requestBackgroundSync("passmark-scan-sync").catch(() => {})
      }

      setTimeout(() => setResult(null), RESULT_DISPLAY_MS)
    },
    [activeZone, supabase]
  )

  const handleResync = async () => {
    setBusy(true)
    await pullCredentialSync()
    setBusy(false)
  }

  if (!activeZone) {
    return <div className="p-6 text-white/70">Pick a zone first.</div>
  }

  const flash =
    result?.outcome === "ALLOW"
      ? "bg-green-600"
      : result?.outcome === "ALREADY_SCANNED"
      ? "bg-amber-500"
      : result
      ? "bg-red-600"
      : ""

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/40">Zone</p>
          <p className="text-[18px] font-bold">{activeZone.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-1 rounded ${online ? "bg-green-700/50" : "bg-red-700/50"}`}>
            {online ? "Online" : "Offline"}
          </span>
          <button
            onClick={handleResync}
            className="p-2 rounded-lg border border-white/10 hover:bg-white/10"
            aria-label="Sync"
            disabled={busy}
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-5">
        <QrScanner active={!result} onDecode={handleScan} />
      </div>

      <div className="px-5 pb-3 text-center text-[12px] text-white/50">
        Hold the QR steady inside the frame. Results play a sound; check the screen if sound is off.
      </div>

      {result && (
        <div className={`pointer-events-none absolute inset-0 ${flash} flex items-center justify-center transition-opacity`}>
          <div className="text-center px-6 max-w-sm">
            {result.outcome === "ALLOW" && <CheckCircle2 className="w-20 h-20 mx-auto mb-3" />}
            {result.outcome === "ALREADY_SCANNED" && <AlertCircle className="w-20 h-20 mx-auto mb-3" />}
            {(result.outcome === "DENY_ZONE" ||
              result.outcome === "DENY_REVOKED" ||
              result.outcome === "DENY_INVALID") && <XCircle className="w-20 h-20 mx-auto mb-3" />}
            <p className="text-3xl font-bold mb-1">
              {result.outcome === "ALLOW"
                ? "Access Granted"
                : result.outcome === "ALREADY_SCANNED"
                ? "Already Scanned"
                : "Access Denied"}
            </p>
            {result.applicantName && (
              <p className="text-lg font-semibold opacity-95">{result.applicantName}</p>
            )}
            {result.org && (
              <p className="text-[14px] opacity-90">
                {result.org}
                {result.designation ? ` · ${result.designation}` : ""}
              </p>
            )}
            {result.reason && (
              <p className="text-[14px] mt-2 opacity-90">{result.reason}</p>
            )}
            {result.firstScannedAt && (
              <p className="text-[12px] mt-1 opacity-80">
                First scanned at {new Date(result.firstScannedAt).toLocaleTimeString("en-GB")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
