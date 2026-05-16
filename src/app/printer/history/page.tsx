"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"

export default function PrinterHistoryPage() {
  const supabase = createClient()
  const [rows, setRows] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("credentials")
        .select(`
          id, print_status, printed_at, serial_number,
          applications ( first_name, last_name, vendor_profiles ( org_name ) )
        `)
        .eq("printed_by", user.id)
        .order("printed_at", { ascending: false })
        .limit(200)
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) return <div className="p-8">Loading history...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Print History</h1>
        <p className="text-[14px] text-neutral-600 mt-1">Cards you've printed.</p>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant</th>
                <th className="px-6 py-4 font-medium">Organisation</th>
                <th className="px-6 py-4 font-medium">Serial</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Printed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3 text-neutral-900">{r.applications?.first_name} {r.applications?.last_name}</td>
                  <td className="px-6 py-3 text-neutral-600">{r.applications?.vendor_profiles?.org_name}</td>
                  <td className="px-6 py-3 text-neutral-600">{r.serial_number || "—"}</td>
                  <td className="px-6 py-3 text-neutral-600">{r.print_status}</td>
                  <td className="px-6 py-3 text-neutral-600">
                    {r.printed_at ? new Date(r.printed_at).toLocaleString("en-GB") : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No prints yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
