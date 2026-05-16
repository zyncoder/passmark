"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function AdminCredentialsPage() {
  const supabase = createClient()
  const [creds, setCreds] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [q, setQ] = React.useState("")
  const [status, setStatus] = React.useState("ALL")

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("credentials")
        .select(`
          id, serial_number, print_status, is_active, created_at,
          applications ( first_name, last_name, designation, vendor_profiles ( org_name ) )
        `)
        .order("created_at", { ascending: false })
      setCreds(data || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = creds.filter((c) => {
    if (status === "ACTIVE" && !c.is_active) return false
    if (status === "REVOKED" && c.is_active) return false
    if (status === "PENDING" && c.print_status !== "PENDING") return false
    if (status === "MAPPED" && c.print_status !== "MAPPED") return false
    if (q.trim()) {
      const needle = q.toLowerCase()
      const hay = `${c.applications?.first_name ?? ""} ${c.applications?.last_name ?? ""} ${c.applications?.vendor_profiles?.org_name ?? ""} ${c.serial_number ?? ""}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })

  if (loading) return <div className="p-8">Loading credentials...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Credentials</h1>
        <p className="text-[14px] text-neutral-600 mt-1">Map printed cards, invalidate lost credentials.</p>
      </div>

      <Card>
        <div className="p-4 border-b border-neutral-100 flex gap-3 bg-neutral-50/50 rounded-t-xl">
          <Input
            placeholder="Search by name, org, or serial..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-md bg-white"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 rounded-lg border-[1.5px] border-neutral-300 text-[14px] text-neutral-900 bg-white"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active only</option>
            <option value="REVOKED">Revoked only</option>
            <option value="PENDING">Pending print</option>
            <option value="MAPPED">Mapped</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant</th>
                <th className="px-6 py-4 font-medium">Organisation</th>
                <th className="px-6 py-4 font-medium">Serial</th>
                <th className="px-6 py-4 font-medium">Print Status</th>
                <th className="px-6 py-4 font-medium">State</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {c.applications?.first_name} {c.applications?.last_name}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {c.applications?.vendor_profiles?.org_name}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {c.serial_number ?? <span className="italic text-neutral-400">unmapped</span>}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{c.print_status}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${c.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {c.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/credentials/${c.id}`}
                      className="text-brand hover:text-brand-dark font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    No credentials match.
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
