"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = React.useState<any>(null)
  const [applications, setApplications] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: appsData }] = await Promise.all([
        supabase.from('vendor_profiles').select('*').eq('id', user.id).single(),
        supabase.from('applications').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      ])

      setProfile(profileData)
      setApplications(appsData || [])
      setLoading(false)
    }
    loadDashboard()
  }, [supabase])

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>
  }

  const submittedCount = applications.filter(a => a.status !== 'DRAFT').length
  const savedCount = applications.filter(a => a.status === 'DRAFT').length
  const quota = profile?.quota || 0
  const remaining = Math.max(0, quota - submittedCount)

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="text-[14px] text-neutral-600 mt-1">Manage your accreditation applications.</p>
        </div>
        <div className="hidden sm:block">
          <Button onClick={() => router.push('/form/new')} disabled={remaining <= 0}>
            New Application
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-[14px] font-semibold text-neutral-600 mb-2 uppercase tracking-wider">Applications Remaining</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand rounded-full transition-all" 
                  style={{ width: `${(submittedCount / quota) * 100}%` }}
                />
              </div>
              <span className="text-[16px] font-semibold text-neutral-900">
                {submittedCount} of {quota} used
              </span>
            </div>
            {remaining <= 0 && (
              <p className="text-[13px] text-danger mt-2">You have reached your application limit.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <h3 className="text-[14px] font-semibold text-neutral-600 mb-1 uppercase tracking-wider">Submitted</h3>
            <p className="text-3xl font-bold text-neutral-900">{submittedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <h3 className="text-[14px] font-semibold text-neutral-600 mb-1 uppercase tracking-wider">Saved Drafts</h3>
            <p className="text-3xl font-bold text-neutral-900">{savedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="sm:hidden flex mt-4">
        <Button className="w-full" onClick={() => router.push('/form/new')} disabled={remaining <= 0}>
          New Application
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant Name</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-600">
                    No applications found. Click "New Application" to get started.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {app.first_name ? `${app.first_name} ${app.last_name}` : <span className="text-neutral-300 italic">Not provided</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={app.status as any} />
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {new Date(app.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/form/${app.id}/${['DRAFT', 'SUBMITTED'].includes(app.status) ? 'edit' : 'view'}`}
                        className="text-brand hover:text-brand-dark font-medium"
                      >
                        {['DRAFT', 'SUBMITTED'].includes(app.status) ? 'Edit' : 'View'}
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
