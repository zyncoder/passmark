"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { pullCredentialSync, lastSyncTime } from "@/lib/guard-sync"
import { getMeta, setMeta } from "@/lib/guard-db"

interface AssignedZone { id: string; name: string }

export default function GuardZonePage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [zones, setZones] = React.useState<AssignedZone[]>([])
  const [activeZoneId, setActiveZoneId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [synced, setSynced] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    const cachedZones = (await getMeta<AssignedZone[]>("assigned_zones")) ?? []
    setZones(cachedZones)
    const active = (await getMeta<string>("active_zone_id")) ?? null
    setActiveZoneId(active)
    setSynced(await lastSyncTime())
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const sync = async () => {
    setBusy(true)
    const result = await pullCredentialSync()
    if (!result.ok) {
      addToast(result.reason ?? "Sync failed", "error")
    } else {
      addToast(`Synced ${result.credentials} credentials`, "success")
      await load()
    }
    setBusy(false)
  }

  const pickZone = async (zone: AssignedZone) => {
    await setMeta("active_zone_id", zone.id)
    await setMeta("active_zone_name", zone.name)
    setActiveZoneId(zone.id)
    addToast(`Checking ${zone.name}`, "success")
    router.push("/guard/scan")
  }

  return (
    <div className="flex-1 flex flex-col p-6 gap-6">
      <div>
        <h1 className="text-xl font-bold">Pick your checkpoint zone</h1>
        <p className="text-[13px] text-white/60 mt-1">
          You can only validate credentials whose access includes this zone.
        </p>
      </div>

      <Card className="bg-neutral-800 border-white/10 text-white">
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-white/70">Last credential sync</p>
              <p className="text-[14px] font-semibold">
                {synced ? new Date(synced).toLocaleTimeString("en-GB") : "Never"}
              </p>
            </div>
            <Button onClick={sync} disabled={busy}>
              {busy ? "Syncing..." : "Sync now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {zones.length === 0 && (
          <p className="text-[13px] text-white/60">
            No zones assigned. Tap <strong>Sync now</strong>, or ask Admin to assign zones.
          </p>
        )}
        {zones.map((z) => (
          <button
            key={z.id}
            onClick={() => pickZone(z)}
            className={`text-left bg-neutral-800 border border-white/10 rounded-2xl p-4 flex justify-between items-center transition-colors ${
              z.id === activeZoneId ? "ring-2 ring-brand" : ""
            }`}
          >
            <div>
              <p className="text-[16px] font-semibold">{z.name}</p>
              <p className="text-[12px] text-white/60">Tap to start scanning this zone</p>
            </div>
            {z.id === activeZoneId && (
              <span className="text-[11px] font-medium text-brand uppercase tracking-wider">Active</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
