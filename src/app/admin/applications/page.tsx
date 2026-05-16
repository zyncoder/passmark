"use client"

import * as React from "react"
import Link from "next/link"
import Papa from "papaparse"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AdminApplicationsPage() {
  const supabase = createClient()
  const [applications, setApplications] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("ALL")

  React.useEffect(() => {
    async function loadApps() {
      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          vendor_profiles ( org_name )
        `)
        .neq('status', 'DRAFT')
        .order('updated_at', { ascending: false })
      
      if (data) setApplications(data)
      setLoading(false)
    }

    loadApps()
  }, [supabase])

  const filteredApps = applications.filter(app => {
    // Status Filter
    if (statusFilter !== "ALL" && app.status !== statusFilter) return false
    
    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const orgName = (app.vendor_profiles?.org_name || "").toLowerCase()
      const applicantName = `${app.first_name || ""} ${app.last_name || ""}`.toLowerCase()
      return orgName.includes(query) || applicantName.includes(query)
    }
    
    return true
  })

  const handleExportCSV = () => {
    if (filteredApps.length === 0) return

    const exportData = filteredApps.map(app => ({
      "Application ID": app.id,
      "Applicant First Name": app.first_name,
      "Applicant Last Name": app.last_name,
      "Organisation": app.vendor_profiles?.org_name,
      "Designation": app.designation,
      "Email": app.email,
      "Mobile": app.mobile,
      "ID Type": app.id_type,
      "ID Number": app.id_number,
      "Status": app.status,
      "Submission Date": new Date(app.submitted_at || app.updated_at).toISOString(),
      "Admin Remarks": app.admin_remarks || ""
    }))

    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `applications_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-8">Loading applications...</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Applications</h1>
          <p className="text-[14px] text-neutral-600 mt-1">Review and manage submitted applications.</p>
        </div>
        <Button variant="secondary" onClick={handleExportCSV} disabled={filteredApps.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row gap-4 bg-neutral-50/50 rounded-t-xl">
          <div className="flex-1">
            <Input 
              placeholder="Search by Applicant or Organisation..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md bg-white"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              className="w-full h-10 px-3 rounded-lg border-[1.5px] border-neutral-300 text-[14px] text-neutral-900 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[rgba(27,79,216,0.15)] bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant</th>
                <th className="px-6 py-4 font-medium">Organisation</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {app.first_name} {app.last_name}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {app.vendor_profiles?.org_name}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {new Date(app.updated_at).toLocaleDateString('en-GB')}
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
              ))}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
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
