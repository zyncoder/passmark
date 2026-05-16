"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { sendEmail, EmailTemplates } from "@/lib/email"

export default function AdminApplicationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  
  const [appId, setAppId] = React.useState<string | null>(null)
  const [app, setApp] = React.useState<any>(null)
  const [zones, setZones] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [remarks, setRemarks] = React.useState("")
  const [isUpdating, setIsUpdating] = React.useState(false)

  React.useEffect(() => {
    params.then(p => setAppId(p.id))
  }, [params])

  React.useEffect(() => {
    async function loadApp() {
      if (!appId) return

      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          vendor_profiles ( org_name, designation )
        `)
        .eq('id', appId)
        .single()
      
      if (data) {
        setApp(data)
        setRemarks(data.admin_remarks || "")
        
        // load zones
        const { data: zonesData } = await supabase
          .from('application_zones')
          .select('zones (name)')
          .eq('application_id', appId)
        
        if (zonesData) {
          setZones(zonesData.map((z: any) => z.zones?.name).filter(Boolean))
        }
      }
      setLoading(false)
    }

    loadApp()
  }, [appId, supabase])

  const handleDecision = async (status: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'DRAFT') => {
    if ((status === 'REJECTED' || status === 'DRAFT') && !remarks.trim()) {
      addToast(`Remarks are required to ${status === 'DRAFT' ? 'request more info' : 'reject'}.`, "error")
      return
    }

    setIsUpdating(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('applications')
      .update({
        status,
        admin_remarks: remarks || null,
        decided_at: new Date().toISOString(),
        decided_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', appId)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast(`Application status updated to ${status}.`, "success")
      setApp({ ...app, status, admin_remarks: remarks })
      
      // Simulate Email Notification
      if (status !== 'UNDER_REVIEW') {
        await sendEmail({
          to: app.email,
          subject: `Application Update: ${status}`,
          body: EmailTemplates.statusChange(
            status === 'DRAFT' ? 'Information Requested' : status, 
            remarks
          )
        })
      }
    }
    setIsUpdating(false)
  }

  if (loading) return <div className="p-8">Loading application...</div>
  if (!app) return <div className="p-8">Application not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Application Review</h1>
        <Badge status={app.status as any} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column - Details */}
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
                  <span key={i} className="px-2.5 py-1 bg-neutral-100 border border-neutral-300 rounded-md text-[13px] font-medium">
                    {z}
                  </span>
                ))}
                {zones.length === 0 && <span className="text-[13px] text-neutral-600">None requested</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Decision & Photo */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider mb-4">Applicant Photo</h2>
              <div className="w-full aspect-[3/4] bg-neutral-100 border border-neutral-300 rounded-lg overflow-hidden">
                {app.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.photo_url} alt="Applicant" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-neutral-600 text-sm">No photo</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="sticky top-6">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-[14px] font-semibold text-neutral-600 uppercase tracking-wider">Decision Panel</h2>
              
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-neutral-900">Admin Remarks</label>
                <textarea
                  className="w-full h-24 rounded-lg border-[1.5px] border-neutral-300 p-3 text-[14px] focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[rgba(27,79,216,0.15)] resize-none"
                  placeholder="Enter remarks (required for rejection)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="default" 
                  className="bg-success hover:bg-green-700 w-full"
                  onClick={() => handleDecision('APPROVED')}
                  disabled={isUpdating || app.status === 'APPROVED'}
                >
                  Approve
                </Button>
                <Button 
                  variant="danger" 
                  className="w-full"
                  onClick={() => handleDecision('REJECTED')}
                  disabled={isUpdating || app.status === 'REJECTED'}
                >
                  Reject
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => handleDecision('UNDER_REVIEW')}
                  disabled={isUpdating || app.status === 'UNDER_REVIEW'}
                >
                  Mark Under Review
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-brand hover:bg-brand-light"
                  onClick={() => handleDecision('DRAFT')}
                  disabled={isUpdating || app.status === 'DRAFT'}
                >
                  Request More Info
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
