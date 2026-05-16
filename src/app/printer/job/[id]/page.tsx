"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { QrScanner } from "@/components/QrScanner"

export default function PrinterJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createClient()
  const router = useRouter()
  const { addToast } = useToast()
  const [id, setId] = React.useState<string | null>(null)
  const [job, setJob] = React.useState<any>(null)
  const [zones, setZones] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)
  const [scanOpen, setScanOpen] = React.useState(false)

  React.useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  const load = React.useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from("credentials")
      .select(`
        id, print_status, is_active, qr_data_url, serial_number,
        applications ( id, first_name, last_name, designation, photo_url, vendor_profiles ( org_name ) )
      `)
      .eq("id", id)
      .single()
    setJob(data)
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

  const markPrinting = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/printer/credentials/${id}/start`, {
        method: "POST",
        headers: await headers(),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error)
      addToast("Marked as printing", "success")
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setBusy(false)
    }
  }

  const handleScan = async (text: string) => {
    setScanOpen(false)
    setBusy(true)
    try {
      const res = await fetch(`/api/printer/credentials/${id}/confirm`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ scannedToken: text }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error)
      addToast("Print confirmed", "success")
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setBusy(false)
    }
  }

  if (!job) return <div className="p-8">Loading job...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {job.applications?.first_name} {job.applications?.last_name}
          </h1>
          <p className="text-[14px] text-neutral-600 mt-1">
            {job.applications?.vendor_profiles?.org_name} · {job.applications?.designation}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded text-[13px] font-medium ${
            job.print_status === "PENDING"
              ? "bg-amber-100 text-amber-800"
              : job.print_status === "PRINTING"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {job.print_status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider mb-3">Photo</h3>
            <div className="w-full aspect-[3/4] bg-neutral-100 border border-neutral-300 rounded-lg overflow-hidden">
              {job.applications?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.applications.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-neutral-600 text-sm">No photo</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Access Zones</h3>
            <div className="flex flex-wrap gap-2">
              {zones.map((z, i) => (
                <span key={i} className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded-md text-[13px] font-medium">{z}</span>
              ))}
              {zones.length === 0 && <span className="text-[13px] text-neutral-500">None</span>}
            </div>
            <hr className="border-neutral-100" />
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">QR</h3>
            {job.qr_data_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.qr_data_url} alt="QR" className="w-40 h-40 border border-neutral-200 rounded-lg" />
            )}
          </CardContent>
        </Card>

        <Card className="sticky top-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Print flow</h3>
            <Button
              className="w-full"
              onClick={markPrinting}
              disabled={busy || job.print_status !== "PENDING"}
            >
              1. Mark as Printing
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => router.push(`/printer/print/${id}`)}
              disabled={job.print_status === "PENDING"}
            >
              2. Print Card
            </Button>
            <Button
              className="w-full"
              onClick={() => setScanOpen(true)}
              disabled={
                busy ||
                job.print_status === "PENDING" ||
                job.print_status === "PRINTED" ||
                job.print_status === "MAPPED"
              }
            >
              3. Scan to Confirm
            </Button>
            {(job.print_status === "PRINTED" || job.print_status === "MAPPED") && (
              <p className="text-[13px] text-green-700 text-center">
                Printed{job.print_status === "MAPPED" ? " · Mapped" : ""}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        title="Scan printed QR to confirm"
        footer={
          <Button variant="ghost" onClick={() => setScanOpen(false)}>Cancel</Button>
        }
      >
        <p className="text-[13px] text-neutral-600 mb-3">
          Point the camera at the QR on the printed card. We'll verify the signature.
        </p>
        <QrScanner active={scanOpen} onDecode={handleScan} />
      </Dialog>
    </div>
  )
}
