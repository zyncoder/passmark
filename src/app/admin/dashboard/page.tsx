"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = React.useState({ users: 0, total: 0, pending: 0, approved: 0, rejected: 0 })
  const [recentApps, setRecentApps] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadStats() {
      // Basic counts via Supabase select with count
      const { count: usersCount } = await supabase.from('vendor_profiles').select('*', { count: 'exact', head: true })
      const { count: totalApps } = await supabase.from('applications').select('*', { count: 'exact', head: true })
      const { count: pendingApps } = await supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'UNDER_REVIEW'])
      const { count: approvedApps } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED')
      const { count: rejectedApps } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED')

      setStats({
        users: usersCount || 0,
        total: totalApps || 0,
        pending: pendingApps || 0,
        approved: approvedApps || 0,
        rejected: rejectedApps || 0,
      })

      // Fetch recent 10 applications with profiles
      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          vendor_profiles ( org_name )
        `)
        .neq('status', 'DRAFT')
        .order('updated_at', { ascending: false })
        .limit(10)
      
      if (data) setRecentApps(data)
      setLoading(false)
    }

    loadStats()
  }, [supabase])

  if (loading) {
    return <div className="p-8">Loading stats...</div>
  }

  const statCards = [
    { label: "Users", value: stats.users },
    { label: "Total", value: stats.total },
    { label: "Pending", value: stats.pending },
    { label: "Approved", value: stats.approved },
    { label: "Rejected", value: stats.rejected },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Admin Dashboard</h1>
        <p className="text-[14px] text-neutral-600 mt-1">System overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex flex-col justify-center h-full text-center">
              <h3 className="text-[14px] font-semibold text-neutral-600 mb-1 uppercase tracking-wider">{stat.label}</h3>
              <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-4 sm:p-6 border-b border-neutral-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Applications</h2>
          <Button variant="secondary" onClick={() => router.push('/admin/applications')}>
            View All
          </Button>
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
              {recentApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-600">
                    No recent applications found.
                  </td>
                </tr>
              ) : (
                recentApps.map((app) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
