"use client"

import * as React from "react"
import Link from "next/link"
import Papa from "papaparse"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function AdminApplicationsPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [applications, setApplications] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [isBulkRunning, setIsBulkRunning] = React.useState(false)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("ALL")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select(`*, vendor_profiles ( org_name )`)
      .neq("status", "DRAFT")
      .order("updated_at", { ascending: false })
    if (data) setApplications(data)
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    load()
  }, [load])

  const filteredApps = applications.filter((app) => {
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const orgName = (app.vendor_profiles?.org_name || "").toLowerCase()
      const applicantName = `${app.first_name || ""} ${app.last_name || ""}`.toLowerCase()
      if (!orgName.includes(q) && !applicantName.includes(q)) return false
    }
    if (dateFrom) {
      if (new Date(app.updated_at) < new Date(dateFrom)) return false
    }
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      if (new Date(app.updated_at) > end) return false
    }
    return true
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const allIds = filteredApps
      .filter((a) => a.status === "SUBMITTED" || a.status === "UNDER_REVIEW")
      .map((a) => a.id)
    if (selected.size === allIds.length && allIds.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  const handleBulkApprove = async () => {
    if (selected.size === 0) return
    setIsBulkRunning(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/admin/applications/bulk-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Bulk approve failed")
      const failures = result.results.filter((r: any) => r.error).length
      addToast(
        `Approved ${result.processed - failures} of ${selected.size}` +
          (failures ? ` (${failures} failed)` : ""),
        failures ? "error" : "success"
      )
      setSelected(new Set())
      await load()
    } catch (e: any) {
      addToast(e.message || "Bulk approve failed", "error")
    } finally {
      setIsBulkRunning(false)
    }
  }

  const handleExportCSV = () => {
    if (filteredApps.length === 0) return
    const rows = filteredApps.map((app) => ({
      "Application ID": app.id,
      "Applicant First Name": app.first_name,
      "Applicant Last Name": app.last_name,
      Organisation: app.vendor_profiles?.org_name,
      Designation: app.designation,
      Email: app.email,
      Mobile: app.mobile,
      "ID Type": app.id_type,
      "ID Number": app.id_number,
      Status: app.status,
      "Submission Date": new Date(app.submitted_at || app.updated_at).toISOString(),
      "Admin Remarks": app.admin_remarks || "",
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `applications_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-8">Loading applications...</div>

  const pendingSelectableCount = filteredApps.filter((a) =>
    ["SUBMITTED", "UNDER_REVIEW"].includes(a.status)
  ).length

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Applications</h1>
          <p className="text-[14px] text-neutral-600 mt-1">Review and manage submitted applications.</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button onClick={handleBulkApprove} disabled={isBulkRunning}>
              {isBulkRunning ? "Approving..." : `Approve ${selected.size} selected`}
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportCSV} disabled={filteredApps.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-neutral-100 flex flex-col lg:flex-row gap-3 bg-neutral-50/50 rounded-t-xl">
          <Input
            placeholder="Search by applicant or organisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md bg-white"
          />
          <select
            className="h-10 px-3 rounded-lg border-[1.5px] border-neutral-300 text-[14px] text-neutral-900 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 px-3 rounded-lg border-[1.5px] border-neutral-300 text-[14px] text-neutral-900 bg-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 px-3 rounded-lg border-[1.5px] border-neutral-300 text-[14px] text-neutral-900 bg-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-4 py-4 font-medium w-10">
                  <input
                    type="checkbox"
                    checked={pendingSelectableCount > 0 && selected.size === pendingSelectableCount}
                    onChange={toggleAll}
                    disabled={pendingSelectableCount === 0}
                  />
                </th>
                <th className="px-6 py-4 font-medium">Applicant</th>
                <th className="px-6 py-4 font-medium">Organisation</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredApps.map((app) => {
                const isSelectable = ["SUBMITTED", "UNDER_REVIEW"].includes(app.status)
                return (
                  <tr key={app.id} className="hover:bg-neutral-50/50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        disabled={!isSelectable}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {app.first_name} {app.last_name}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {app.vendor_profiles?.org_name}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {new Date(app.updated_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={app.status as any} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="text-brand hover:text-brand-dark font-medium"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    No applications match your filters.
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
