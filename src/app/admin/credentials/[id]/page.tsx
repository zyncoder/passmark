"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function AdminCredentialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createClient()
  const { addToast } = useToast()
  const [id, setId] = React.useState<string | null>(null)
  const [cred, setCred] = React.useState<any>(null)
  const [zones, setZones] = React.useState<string[]>([])
  const [serial, setSerial] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [scannedToken, setScannedToken] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  const load = React.useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from("credentials")
      .select(`
        *,
        applications ( first_name, last_name, designation, email, mobile, photo_url, vendor_profiles ( org_name ) )
      `)
      .eq("id", id)
      .single()
    setCred(data)
    setSerial(data?.serial_number || "")

    const { data: cz } = await supabase
      .from("credential_zones")
      .select("zones ( name )")
      .eq("credential_id", id)
    setZones((cz || []).map((z: any) => z.zones?.name).filter(Boolean))
  }, [id, supabase])

  React.useEffect(() => {
    load()
  }, [load])

  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    }
  }

  const handleMap = async () => {
    if (!serial.trim()) return addToast("Serial required", "error")
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/credentials/${id}/map`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ serial: serial.trim(), scannedToken: scannedToken.trim() || undefined }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      addToast("Mapped", "success")
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setBusy(false)
    }
  }

  const handleInvalidate = async () => {
    if (!confirm("Invalidate this credential? Guards will deny on next scan.")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/credentials/${id}/invalidate`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ reason }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      addToast("Credential revoked", "success")
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setBusy(false)
    }
  }

  if (!cred) return <div className="p-8">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {cred.applications?.first_name} {cred.applications?.last_name}
          </h1>
          <p className="text-[14px] text-neutral-600 mt-1">
            {cred.applications?.vendor_profiles?.org_name} · {cred.applications?.designation}
          </p>
        </div>
        <span className={`px-3 py-1 rounded text-[13px] font-medium ${cred.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {cred.is_active ? "Active" : "Revoked"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">QR Code</h3>
            {cred.qr_data_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cred.qr_data_url} alt="QR" className="w-48 h-48 border border-neutral-200 rounded-lg" />
            )}
            <div className="text-[12px] text-neutral-500 break-all">
              <strong className="text-neutral-700">Payload:</strong> <code>{cred.qr_payload}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Allowed Zones</h3>
            <div className="flex flex-wrap gap-2">
              {zones.map((z, i) => (
                <span key={i} className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded-md text-[13px] font-medium">{z}</span>
              ))}
              {zones.length === 0 && <span className="text-[13px] text-neutral-500">No zones</span>}
            </div>
            <hr className="border-neutral-100" />
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Print</h3>
            <p className="text-[14px] text-neutral-900">Status: <strong>{cred.print_status}</strong></p>
            {cred.printed_at && (
              <p className="text-[13px] text-neutral-600">Printed at {new Date(cred.printed_at).toLocaleString("en-GB")}</p>
            )}
            {cred.mapped_at && (
              <p className="text-[13px] text-neutral-600">Mapped at {new Date(cred.mapped_at).toLocaleString("en-GB")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Map Serial</h3>
            <Input
              label="Physical Serial #"
              placeholder="e.g. SN-00042"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              disabled={busy || !cred.is_active}
            />
            <div className="text-[12px] text-neutral-600">Optional: paste a scanned QR token to verify match.</div>
            <Input
              placeholder="<credentialId|...>.<signature>"
              value={scannedToken}
              onChange={(e) => setScannedToken(e.target.value)}
              disabled={busy || !cred.is_active}
            />
            <Button onClick={handleMap} disabled={busy || !cred.is_active} className="w-full">
              {busy ? "Mapping..." : "Map credential"}
            </Button>

            <hr className="border-neutral-100" />

            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Invalidate</h3>
            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy || !cred.is_active}
            />
            <Button variant="danger" className="w-full" onClick={handleInvalidate} disabled={busy || !cred.is_active}>
              {busy ? "Revoking..." : "Revoke credential"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
