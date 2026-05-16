"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { sendEmail, EmailTemplates } from "@/lib/email"

type Decision = "approve" | "reject" | "request-info"

const STATUS_LABEL: Record<Decision, string> = {
  approve: "APPROVED",
  reject: "REJECTED",
  "request-info": "Information Requested",
}

export default function AdminApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createClient()
  const { addToast } = useToast()

  const [appId, setAppId] = React.useState<string | null>(null)
  const [app, setApp] = React.useState<any>(null)
  const [credential, setCredential] = React.useState<any>(null)
  const [zones, setZones] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [remarks, setRemarks] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)

  React.useEffect(() => {
    params.then((p) => setAppId(p.id))
  }, [params])

  const load = React.useCallback(async () => {
    if (!appId) return
    const { data } = await supabase
      .from("applications")
      .select(`*, vendor_profiles ( org_name, designation )`)
      .eq("id", appId)
      .single()

    if (data) {
      setApp(data)
      setRemarks(data.admin_remarks || "")

      const { data: zonesData } = await supabase
        .from("application_zones")
        .select("zones (name)")
        .eq("application_id", appId)
      if (zonesData) {
        setZones(zonesData.map((z: any) => z.zones?.name).filter(Boolean))
      }

      const { data: credData } = await supabase
        .from("credentials")
        .select("id, qr_data_url, print_status, serial_number, is_active")
        .eq("application_id", appId)
        .maybeSingle()
      setCredential(credData)
    }
    setLoading(false)
  }, [appId, supabase])

  React.useEffect(() => {
    load()
  }, [load])

  const decide = async (decision: Decision) => {
    if ((decision === "reject" || decision === "request-info") && !remarks.trim()) {
      addToast(`Remarks are required to ${decision === "reject" ? "reject" : "request more info"}.`, "error")
      return
    }
    setIsUpdating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      }

      const url =
        decision === "approve"
          ? `/api/admin/applications/${appId}/approve`
          : decision === "reject"
          ? `/api/admin/applications/${appId}/reject`
          : `/api/admin/applications/${appId}/request-info`

      const body =
        decision === "approve" ? undefined : JSON.stringify({ remarks })

      const res = await fetch(url, { method: "POST", headers, body })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? "Action failed")

      addToast(`Status updated: ${STATUS_LABEL[decision]}`, "success")
      if (decision !== "approve") {
        await sendEmail({
          to: app.email,
          subject: `Application Update: ${STATUS_LABEL[decision]}`,
          body: EmailTemplates.statusChange(STATUS_LABEL[decision], remarks),
        })
      } else {
        await sendEmail({
          to: app.email,
          subject: `Application Approved`,
          body: EmailTemplates.statusChange("APPROVED"),
        })
      }
      await load()
    } catch (e: any) {
      addToast(e.message ?? "Action failed", "error")
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) return <div className="p-8">Loading application...</div>
  if (!app) return <div className="p-8">Application not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Application Review</h1>
        <Badge status={app.status as any} />
        {credential && !credential.is_active && (
          <span className="px-2 py-0.5 rounded-md text-[12px] font-medium bg-red-100 text-red-800">
            Credential Revoked
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <h2 className="text-lg font-semibold border-b pb-2">Personal Information</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[14px]">
                <div>
                  <p className="text-neutral-600">Full Name</p>
                  <p className="font-medium text-neutral-900">{app.first_name} {app.last_name}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Organisation</p>
                  <p className="font-medium text-neutral-900">{app.vendor_profiles?.org_name}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Designation</p>
                  <p className="font-medium text-neutral-900">{app.designation}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Email</p>
                  <p className="font-medium text-neutral-900">{app.email}</p>
                </div>
                <div>
                  <p className="text-neutral-600">Mobile</p>
                  <p className="font-medium text-neutral-900">{app.mobile}</p>
                </div>
              </div>

              <h2 className="text-lg font-semibold border-b pb-2 pt-4">Identification</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[14px]">
                <div>
                  <p className="text-neutral-600">ID Type</p>
                  <p className="font-medium text-neutral-900">{app.id_type}</p>
                </div>
                <div>
                  <p className="text-neutral-600">ID Number</p>
                  <p className="font-medium text-neutral-900">{app.id_number}</p>
                </div>
              </div>

              <h2 className="text-lg font-semibold border-b pb-2 pt-4">Requested Access Zones</h2>
              <div className="flex flex-wrap gap-2">
                {zones.map((z, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded-md text-[13px] font-medium"
                  >
                    {z}
                  </span>
                ))}
                {zones.length === 0 && (
                  <span className="text-[13px] text-neutral-600">None requested</span>
                )}
              </div>
            </CardContent>
          </Card>

          {credential && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Credential</h2>
                  <span className="text-[13px] text-neutral-600">
                    Print status: <strong className="text-neutral-900">{credential.print_status}</strong>
                    {credential.serial_number && (
                      <> · Serial <strong>{credential.serial_number}</strong></>
                    )}
                  </span>
                </div>
                {credential.qr_data_url && (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={credential.qr_data_url} alt="QR" className="w-32 h-32 border border-neutral-200 rounded-lg" />
                    <div className="text-[13px] text-neutral-600 space-y-1">
                      <p>Credential ID: <code className="text-neutral-900">{credential.id.split("-")[0]}…</code></p>
                      <Link
                        href={`/admin/credentials/${credential.id}`}
                        className="text-brand hover:text-brand-dark font-medium"
                      >
                        Manage credential
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider mb-4">
                Applicant Photo
              </h2>
              <div className="w-full aspect-[3/4] bg-neutral-100 border border-neutral-300 rounded-lg overflow-hidden">
                {app.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.photo_url} alt="Applicant" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-neutral-600 text-sm">
                    No photo
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="sticky top-6">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">
                Decision Panel
              </h2>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-neutral-900">Admin Remarks</label>
                <textarea
                  className="w-full h-24 rounded-lg border-[1.5px] border-neutral-300 p-3 text-[14px] focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[rgba(27,79,216,0.15)] resize-none"
                  placeholder="Required for reject / request info"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="default"
                  className="bg-success hover:bg-green-700 w-full"
                  onClick={() => decide("approve")}
                  disabled={isUpdating || app.status === "APPROVED"}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => decide("reject")}
                  disabled={isUpdating || app.status === "REJECTED"}
                >
                  Reject
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full text-brand hover:bg-brand-light"
                onClick={() => decide("request-info")}
                disabled={isUpdating}
              >
                Request More Info
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
