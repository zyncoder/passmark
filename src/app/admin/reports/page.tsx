"use client"

import * as React from "react"
import Papa from "papaparse"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function AdminReportsPage() {
  const supabase = createClient()
  const [busy, setBusy] = React.useState<string | null>(null)
  const [summary, setSummary] = React.useState({
    submissionByVendor: [] as { org: string; submitted: number; approved: number }[],
    approvalRate: 0,
    printingBacklog: 0,
  })

  React.useEffect(() => {
    async function loadSummary() {
      const { data: apps } = await supabase
        .from("applications")
        .select("status, vendor_profiles ( org_name )")
        .neq("status", "DRAFT")
      const grouped = new Map<string, { submitted: number; approved: number }>()
      for (const a of apps ?? []) {
        const org = (a as any).vendor_profiles?.org_name || "—"
        if (!grouped.has(org)) grouped.set(org, { submitted: 0, approved: 0 })
        grouped.get(org)!.submitted++
        if (a.status === "APPROVED") grouped.get(org)!.approved++
      }
      const submissionByVendor = Array.from(grouped.entries())
        .map(([org, x]) => ({ org, ...x }))
        .sort((a, b) => b.submitted - a.submitted)
        .slice(0, 10)

      const approved = (apps ?? []).filter((a) => a.status === "APPROVED").length
      const total = (apps ?? []).length || 1
      const approvalRate = Math.round((approved / total) * 1000) / 10

      const { count: backlog } = await supabase
        .from("credentials")
        .select("*", { count: "exact", head: true })
        .eq("print_status", "PENDING")

      setSummary({
        submissionByVendor,
        approvalRate,
        printingBacklog: backlog || 0,
      })
    }
    loadSummary()
  }, [supabase])

  const exportApplications = async () => {
    setBusy("apps")
    const { data } = await supabase
      .from("applications")
      .select(`*, vendor_profiles ( org_name )`)
    if (data) {
      const rows = data.map((a: any) => ({
        ApplicationID: a.id,
        First: a.first_name,
        Last: a.last_name,
        Org: a.vendor_profiles?.org_name,
        Designation: a.designation,
        Email: a.email,
        Mobile: a.mobile,
        IDType: a.id_type,
        IDNumber: a.id_number,
        Status: a.status,
        Submitted: a.submitted_at,
        Updated: a.updated_at,
        Remarks: a.admin_remarks,
      }))
      download(`applications_${new Date().toISOString().slice(0, 10)}.csv`, Papa.unparse(rows))
    }
    setBusy(null)
  }

  const exportCredentials = async () => {
    setBusy("creds")
    const { data } = await supabase
      .from("credentials")
      .select(`
        id, serial_number, print_status, is_active, created_at,
        applications ( first_name, last_name, designation, email, vendor_profiles ( org_name ) ),
        credential_zones ( zones ( name ) )
      `)
      .order("created_at", { ascending: false })
    if (data) {
      const rows = data.map((c: any) => ({
        CredentialID: c.id,
        Serial: c.serial_number,
        PrintStatus: c.print_status,
        Active: c.is_active,
        Applicant: `${c.applications?.first_name ?? ""} ${c.applications?.last_name ?? ""}`.trim(),
        Designation: c.applications?.designation,
        Email: c.applications?.email,
        Org: c.applications?.vendor_profiles?.org_name,
        Zones: (c.credential_zones ?? []).map((z: any) => z.zones?.name).filter(Boolean).join("; "),
        CreatedAt: c.created_at,
      }))
      download(`credentials_${new Date().toISOString().slice(0, 10)}.csv`, Papa.unparse(rows))
    }
    setBusy(null)
  }

  const exportScans = async () => {
    setBusy("scans")
    const { data } = await supabase
      .from("scan_logs")
      .select(`
        id, scanned_at, outcome, zone_label, reason, device_id,
        credentials ( serial_number, applications ( first_name, last_name ) ),
        guards ( username )
      `)
      .order("scanned_at", { ascending: false })
      .limit(50_000)
    if (data) {
      const rows = data.map((s: any) => ({
        Time: s.scanned_at,
        Guard: s.guards?.username,
        Zone: s.zone_label,
        Outcome: s.outcome,
        Reason: s.reason,
        Applicant: `${s.credentials?.applications?.first_name ?? ""} ${s.credentials?.applications?.last_name ?? ""}`.trim(),
        Serial: s.credentials?.serial_number,
        Device: s.device_id,
      }))
      download(`scans_${new Date().toISOString().slice(0, 10)}.csv`, Papa.unparse(rows))
    }
    setBusy(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Reports</h1>
        <p className="text-[14px] text-neutral-600 mt-1">Exports and summary statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-neutral-600">Approval Rate</h3>
            <p className="text-3xl font-bold mt-1">{summary.approvalRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-neutral-600">Printing Backlog</h3>
            <p className="text-3xl font-bold mt-1">{summary.printingBacklog}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-neutral-600">Exports</h3>
            <Button className="w-full" variant="secondary" onClick={exportApplications} disabled={busy !== null}>
              {busy === "apps" ? "Exporting..." : "All Applications (CSV)"}
            </Button>
            <Button className="w-full" variant="secondary" onClick={exportCredentials} disabled={busy !== null}>
              {busy === "creds" ? "Exporting..." : "Credentials (CSV)"}
            </Button>
            <Button className="w-full" variant="secondary" onClick={exportScans} disabled={busy !== null}>
              {busy === "scans" ? "Exporting..." : "Scan Log (CSV)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-lg font-semibold">Submissions by Vendor (top 10)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-3 font-medium">Organisation</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
                <th className="px-6 py-3 font-medium">Approved</th>
                <th className="px-6 py-3 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {summary.submissionByVendor.map((r) => (
                <tr key={r.org}>
                  <td className="px-6 py-3 text-neutral-900">{r.org}</td>
                  <td className="px-6 py-3 text-neutral-600">{r.submitted}</td>
                  <td className="px-6 py-3 text-neutral-600">{r.approved}</td>
                  <td className="px-6 py-3 text-neutral-600">
                    {Math.round((r.approved / Math.max(1, r.submitted)) * 100)}%
                  </td>
                </tr>
              ))}
              {summary.submissionByVendor.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-neutral-500">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
