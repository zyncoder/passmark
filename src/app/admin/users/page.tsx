"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { EmailTemplates, sendEmail } from "@/lib/email"

export default function AdminUsersPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  
  const [users, setUsers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  // Dialog states
  const [isQuotaOpen, setIsQuotaOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<any>(null)
  const [newQuota, setNewQuota] = React.useState("")
  
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [newVendor, setNewVendor] = React.useState({ email: '', orgName: '', quota: '5' })
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const loadUsers = React.useCallback(async () => {
    const { data } = await supabase
      .from('vendor_profiles')
      .select(`*, applications (id, status)`)
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleEditQuota = (user: any) => {
    setSelectedUser(user)
    setNewQuota(user.quota.toString())
    setIsQuotaOpen(true)
  }

  const saveQuota = async () => {
    setIsSubmitting(true)
    const quotaNum = parseInt(newQuota, 10)
    if (isNaN(quotaNum) || quotaNum < 0) {
      addToast("Invalid quota amount", "error")
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase
      .from('vendor_profiles')
      .update({ quota: quotaNum })
      .eq('id', selectedUser.id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast("Quota updated successfully", "success")
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, quota: quotaNum } : u))
      setIsQuotaOpen(false)
    }
    setIsSubmitting(false)
  }

  const handleToggleActive = async (user: any) => {
    const newStatus = !user.is_active
    const { error } = await supabase
      .from('vendor_profiles')
      .update({ is_active: newStatus })
      .eq('id', user.id)

    if (error) {
      addToast(error.message, "error")
    } else {
      addToast(`Vendor account ${newStatus ? 'activated' : 'deactivated'}`, "success")
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
    }
  }

  const handleAddVendor = async () => {
    setIsSubmitting(true)
    try {
      // Note: In a real production environment, we would use Supabase Admin API 
      // (with Service Role Key) on the server to create the auth.users record.
      // Since we don't have it configured, we simulate the success here.
      
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!"
      
      // Simulate sending the email
      await sendEmail({
        to: newVendor.email,
        subject: "Passmark Platform Invitation",
        body: EmailTemplates.vendorWelcome(newVendor.email, tempPassword)
      })

      addToast("Vendor invited successfully! (Simulated)", "success")
      setIsAddOpen(false)
      setNewVendor({ email: '', orgName: '', quota: '5' })
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8">Loading users...</div>

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Users</h1>
          <p className="text-[14px] text-neutral-600 mt-1">Manage vendor accounts and quotas.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>Add Vendor</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px] whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 font-medium">Organisation</th>
                <th className="px-6 py-4 font-medium">Coordinator</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Quota Used</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((user) => {
                const submittedApps = user.applications?.filter((a: any) => a.status !== 'DRAFT').length || 0;
                
                return (
                  <tr key={user.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {user.org_name}
                      <p className="text-xs text-neutral-500 font-normal mt-0.5">{user.username}</p>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {user.first_name ? `${user.first_name} ${user.last_name}` : <span className="italic text-neutral-400">Not registered</span>}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {submittedApps} / {user.quota}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button 
                        onClick={() => handleEditQuota(user)}
                        className="text-brand hover:text-brand-dark font-medium"
                      >
                        Edit Quota
                      </button>
                      <button 
                        onClick={() => handleToggleActive(user)}
                        className={`${user.is_active ? 'text-danger hover:text-red-800' : 'text-success hover:text-green-800'} font-medium`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No vendors found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Quota Dialog */}
      <Dialog
        isOpen={isQuotaOpen}
        onClose={() => setIsQuotaOpen(false)}
        title="Edit Application Quota"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsQuotaOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={saveQuota} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Quota"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Set the maximum number of applications <span className="font-semibold text-neutral-900">{selectedUser?.org_name}</span> can submit.
          </p>
          <Input 
            label="Application Quota"
            type="number"
            min="0"
            value={newQuota}
            onChange={(e) => setNewQuota(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </Dialog>

      {/* Add Vendor Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Invite New Vendor"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddVendor} disabled={isSubmitting || !newVendor.email || !newVendor.orgName}>
              {isSubmitting ? "Inviting..." : "Send Invitation"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            The vendor will receive an email with their temporary password and login link.
          </p>
          <Input 
            label="Organisation Name"
            placeholder="e.g. Acme Corp"
            value={newVendor.orgName}
            onChange={(e) => setNewVendor({ ...newVendor, orgName: e.target.value })}
            disabled={isSubmitting}
          />
          <Input 
            label="Email Address"
            type="email"
            placeholder="vendor@example.com"
            value={newVendor.email}
            onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
            disabled={isSubmitting}
          />
          <Input 
            label="Initial Application Quota"
            type="number"
            min="1"
            value={newVendor.quota}
            onChange={(e) => setNewVendor({ ...newVendor, quota: e.target.value })}
            disabled={isSubmitting}
          />
        </div>
      </Dialog>
    </div>
  )
}
