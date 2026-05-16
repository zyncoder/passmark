"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"

export default function PrinterQueuePage() {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState<"pending" | "printing" | "all">("pending")

  const load = React.useCallback(async () => {
    const q = supabase
      .from("credentials")
      .select(`
        id, print_status, created_at, serial_number,
        applications ( first_name, last_name, designation, photo_url, vendor_profiles ( org_name ) ),
        credential_zones ( zones ( name ) )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (tab === "pending") q.eq("print_status", "PENDING")
    if (tab === "printing") q.eq("print_status", "PRINTING")

    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }, [supabase, tab])

  React.useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="p-8">Loading queue...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Print Queue</h1>
        <p className="text-[14px] text-neutral-600 mt-1">Jobs assigned for printing.</p>
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {(["pending", "printing", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[14px] font-medium capitalize border-b-2 ${
              tab === t ? "border-brand text-brand" : "border-transparent text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant</th>
                <th className="px-6 py-4 font-medium">Organisation</th>
                <th className="px-6 py-4 font-medium">Access</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Queued</th>
                <th className="px-6 py-4 font-medium text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {r.applications?.first_name} {r.applications?.last_name}
                    <p className="text-xs text-neutral-500 font-normal">{r.applications?.designation}</p>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{r.applications?.vendor_profiles?.org_name}</td>
                  <td className="px-6 py-4 text-neutral-600">
                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                      {(r.credential_zones || []).map((cz: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-neutral-100 font-medium">
                          {cz.zones?.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${
                      r.print_status === "PENDING" ? "bg-amber-100 text-amber-800" :
                      r.print_status === "PRINTING" ? "bg-blue-100 text-blue-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {r.print_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/printer/job/${r.id}`} className="text-brand hover:text-brand-dark font-medium">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">Nothing to print right now.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
