"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { drainOutbox } from "@/lib/guard-db"
import { flushScanOutbox } from "@/lib/guard-sync"

const OUTCOME_COLOR: Record<string, string> = {
  ALLOW: "bg-green-700",
  DENY_ZONE: "bg-red-700",
  DENY_REVOKED: "bg-red-700",
  DENY_INVALID: "bg-red-700",
  ALREADY_SCANNED: "bg-amber-600",
}

export default function GuardLogPage() {
  const supabase = createClient()
  const [serverScans, setServerScans] = React.useState<any[]>([])
  const [pending, setPending] = React.useState<any[]>([])
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [outbox, res] = await Promise.all([
      drainOutbox(),
      fetch("/api/guard/scans?limit=100", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : { scans: [] })),
    ])
    setPending(outbox)
    setServerScans(res.scans ?? [])
  }, [supabase])

  React.useEffect(() => {
    load()
  }, [load])

  const flush = async () => {
    setBusy(true)
    await flushScanOutbox()
    await load()
    setBusy(false)
  }

  return (
    <div className="flex-1 flex flex-col p-5 gap-5">
      <div>
        <h1 className="text-xl font-bold">Scan Log</h1>
        <p className="text-[13px] text-white/60 mt-1">
          {pending.length > 0
            ? `${pending.length} scans queued offline.`
            : "All scans synced."}
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="bg-amber-500/20 border-amber-500/40 text-white">
          <div className="p-4 flex items-center justify-between">
            <p className="text-[14px]">{pending.length} pending sync</p>
            <Button onClick={flush} disabled={busy}>
              {busy ? "Syncing..." : "Sync now"}
            </Button>
          </div>
        </Card>
      )}

      <Card className="bg-neutral-800 border-white/10 text-white">
        <div className="divide-y divide-white/10">
          {serverScans.length === 0 && (
            <p className="p-4 text-[14px] text-white/60">No scans yet.</p>
          )}
          {serverScans.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${OUTCOME_COLOR[s.outcome] ?? "bg-neutral-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium truncate">
                  {s.credentials?.applications?.first_name} {s.credentials?.applications?.last_name}
                </p>
                <p className="text-[12px] text-white/60">
                  {s.zone_label} · {new Date(s.scanned_at).toLocaleTimeString("en-GB")}
                </p>
                {s.reason && <p className="text-[12px] text-white/60">{s.reason}</p>}
              </div>
              <span className="text-[11px] font-semibold tracking-wider">{s.outcome}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
