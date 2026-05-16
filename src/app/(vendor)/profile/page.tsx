"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { User, Building, Phone, Mail, CreditCard } from "lucide-react"

export default function ProfilePage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [profile, setProfile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    mobile: "",
    landline: "",
    address_line1: "",
    address_line2: "",
  })

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("vendor_profiles").select("*").eq("id", user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          mobile: data.mobile || "",
          landline: data.landline || "",
          address_line1: data.address_line1 || "",
          address_line2: data.address_line2 || "",
        })
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from("vendor_profiles")
      .update(form)
      .eq("id", profile.id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast("Profile updated successfully", "success")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <div className="p-8 text-neutral-500">Profile not found.</div>
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">My Profile</h1>
        <p className="text-[14px] text-neutral-500 mt-1">View and update your vendor profile details.</p>
      </div>

      {/* Organisation Info (read-only) */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-[15px] font-semibold text-neutral-900 mb-5 flex items-center gap-2">
            <Building className="w-4 h-4 text-neutral-400" />
            Organisation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Organisation Name</p>
              <p className="text-[15px] font-semibold text-neutral-900">{profile.org_name}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Designation</p>
              <p className="text-[15px] font-semibold text-neutral-900">{profile.designation || "—"}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Quota</p>
              <p className="text-[15px] font-semibold text-neutral-900">{profile.quota} applications</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Account Status</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold ${profile.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {profile.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ID Info (read-only) */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-[15px] font-semibold text-neutral-900 mb-5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-neutral-400" />
            Identity Verification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-wider mb-1">ID Type</p>
              <p className="text-[15px] font-semibold text-neutral-900">{profile.id_type || "—"}</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-wider mb-1">ID Number</p>
              <p className="text-[15px] font-semibold text-neutral-900">{profile.id_number || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Contact Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-[15px] font-semibold text-neutral-900 mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-400" />
            Contact Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              />
              <Input
                label="Last Name"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Mobile"
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
              />
              <Input
                label="Landline (Optional)"
                value={form.landline}
                onChange={e => setForm(f => ({ ...f, landline: e.target.value }))}
              />
            </div>
            <Input
              label="Address Line 1"
              value={form.address_line1}
              onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}
            />
            <Input
              label="Address Line 2 (Optional)"
              value={form.address_line2}
              onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
