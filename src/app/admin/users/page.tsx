"use client"

import * as React from "react"
import Papa from "papaparse"
import { createClient } from "@/utils/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { EmailTemplates, sendEmail } from "@/lib/email"

type Tab = "vendors" | "printers" | "guards"

export default function AdminUsersPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [tab, setTab] = React.useState<Tab>("vendors")

  const [vendors, setVendors] = React.useState<any[]>([])
  const [printers, setPrinters] = React.useState<any[]>([])
  const [guards, setGuards] = React.useState<any[]>([])
  const [zones, setZones] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  // Dialogs
  const [isQuotaOpen, setIsQuotaOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<any>(null)
  const [newQuota, setNewQuota] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [isAddVendorOpen, setIsAddVendorOpen] = React.useState(false)
  const [newVendor, setNewVendor] = React.useState({ email: "", orgName: "", quota: "5" })

  const [isAddPrinterOpen, setIsAddPrinterOpen] = React.useState(false)
  const [newPrinter, setNewPrinter] = React.useState({ email: "" })

  const [isAddGuardOpen, setIsAddGuardOpen] = React.useState(false)
  const [newGuard, setNewGuard] = React.useState<{ email: string; zoneIds: Set<string> }>({
    email: "",
    zoneIds: new Set(),
  })

  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [importPreview, setImportPreview] = React.useState<any[]>([])

  const load = React.useCallback(async () => {
    setLoading(true)
    const [v, p, g, z] = await Promise.all([
      supabase
        .from("vendor_profiles")
        .select(`*, applications (id, status)`)
        .order("created_at", { ascending: false }),
      supabase.from("printers").select("*").order("created_at", { ascending: false }),
      supabase
        .from("guards")
        .select("*, guard_zones ( zone_id, zones ( id, name ) )")
        .order("created_at", { ascending: false }),
      supabase.from("zones").select("*").order("name"),
    ])
    setVendors(v.data || [])
    setPrinters(p.data || [])
    setGuards(g.data || [])
    setZones(z.data || [])
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    load()
  }, [load])

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    }
  }

  const handleAddVendor = async () => {
    setIsSubmitting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch("/api/admin/invite-vendor", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: newVendor.email,
          orgName: newVendor.orgName,
          quota: newVendor.quota,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to invite vendor")
      await sendEmail({
        to: newVendor.email,
        subject: "Passmark Platform Invitation",
        body: EmailTemplates.vendorWelcome(newVendor.email, result.tempPassword),
      })
      addToast(`Vendor account created for ${newVendor.email}`, "success")
      setIsAddVendorOpen(false)
      setNewVendor({ email: "", orgName: "", quota: "5" })
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddPrinter = async () => {
    setIsSubmitting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch("/api/admin/printers", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: newPrinter.email }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to create printer")
      await sendEmail({
        to: newPrinter.email,
        subject: "Passmark Printer Account",
        body: EmailTemplates.vendorWelcome(newPrinter.email, result.tempPassword),
      })
      addToast(`Printer account created for ${newPrinter.email}`, "success")
      setIsAddPrinterOpen(false)
      setNewPrinter({ email: "" })
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddGuard = async () => {
    setIsSubmitting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch("/api/admin/guards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: newGuard.email,
          zoneIds: Array.from(newGuard.zoneIds),
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to create guard")
      await sendEmail({
        to: newGuard.email,
        subject: "Passmark Guard App Invitation",
        body: EmailTemplates.vendorWelcome(newGuard.email, result.tempPassword),
      })
      addToast(`Guard account created for ${newGuard.email}`, "success")
      setIsAddGuardOpen(false)
      setNewGuard({ email: "", zoneIds: new Set() })
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditQuota = (user: any) => {
    setSelectedUser(user)
    setNewQuota(user.quota.toString())
    setIsQuotaOpen(true)
  }

  const saveQuota = async () => {
    setIsSubmitting(true)
    const n = parseInt(newQuota, 10)
    if (isNaN(n) || n < 0) {
      addToast("Invalid quota", "error")
      setIsSubmitting(false)
      return
    }
    const { error } = await supabase
      .from("vendor_profiles")
      .update({ quota: n })
      .eq("id", selectedUser.id)
    if (error) addToast(error.message, "error")
    else {
      addToast("Quota updated", "success")
      setVendors((u) => u.map((x) => (x.id === selectedUser.id ? { ...x, quota: n } : x)))
      setIsQuotaOpen(false)
    }
    setIsSubmitting(false)
  }

  const handleToggleVendor = async (user: any) => {
    const next = !user.is_active
    const { error } = await supabase
      .from("vendor_profiles")
      .update({ is_active: next })
      .eq("id", user.id)
    if (error) return addToast(error.message, "error")
    addToast(next ? "Activated" : "Deactivated", "success")
    setVendors((u) => u.map((x) => (x.id === user.id ? { ...x, is_active: next } : x)))
  }

  const togglePrinter = async (printer: any) => {
    const headers = await authHeaders()
    const res = await fetch(`/api/admin/printers/${printer.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_active: !printer.is_active }),
    })
    if (!res.ok) return addToast("Failed to update", "error")
    setPrinters((u) =>
      u.map((x) => (x.id === printer.id ? { ...x, is_active: !printer.is_active } : x))
    )
  }

  const toggleGuard = async (guard: any) => {
    const headers = await authHeaders()
    const res = await fetch(`/api/admin/guards/${guard.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_active: !guard.is_active }),
    })
    if (!res.ok) return addToast("Failed to update", "error")
    setGuards((u) =>
      u.map((x) => (x.id === guard.id ? { ...x, is_active: !guard.is_active } : x))
    )
  }

  const handleCSVPick = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const normalised = (result.data as any[]).map((r) => ({
          org_name: r.org_name || r["Organisation"] || r.organisation,
          coordinator_name: r.coordinator_name || r.coordinator,
          email: r.email,
          designation: r.designation,
          quota: r.quota ? Number(r.quota) : 5,
        }))
        setImportPreview(normalised.filter((x) => x.email && x.org_name))
      },
    })
  }

  const handleRunImport = async () => {
    if (importPreview.length === 0) return
    setIsSubmitting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch("/api/admin/vendors/bulk-import", {
        method: "POST",
        headers,
        body: JSON.stringify({ rows: importPreview }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Import failed")
      addToast(
        `Imported ${result.counts.created} · ${result.counts.exists} existed · ${result.counts.error} errors`,
        result.counts.error ? "error" : "success"
      )
      setIsImportOpen(false)
      setImportPreview([])
      load()
    } catch (e: any) {
      addToast(e.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8">Loading users...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Users</h1>
          <p className="text-[14px] text-neutral-600 mt-1">Manage vendor, printer and guard accounts.</p>
        </div>
        <div className="flex gap-2">
          {tab === "vendors" && (
            <>
              <Button variant="secondary" onClick={() => setIsImportOpen(true)}>Import CSV</Button>
              <Button onClick={() => setIsAddVendorOpen(true)}>Add Vendor</Button>
            </>
          )}
          {tab === "printers" && (
            <Button onClick={() => setIsAddPrinterOpen(true)}>Add Printer</Button>
          )}
          {tab === "guards" && (
            <Button onClick={() => setIsAddGuardOpen(true)}>Add Guard</Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {(["vendors", "printers", "guards"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[14px] font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-brand text-brand"
                : "border-transparent text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "vendors" && (
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
                {vendors.map((u) => {
                  const used = u.applications?.filter((a: any) => a.status !== "DRAFT").length || 0
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50">
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        {u.org_name}
                        <p className="text-xs text-neutral-500 font-normal mt-0.5">{u.username}</p>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {u.first_name
                          ? `${u.first_name} ${u.last_name}`
                          : <span className="italic text-neutral-400">Not registered</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">{used} / {u.quota}</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button onClick={() => handleEditQuota(u)} className="text-brand hover:text-brand-dark font-medium">Edit Quota</button>
                        <button onClick={() => handleToggleVendor(u)} className={`${u.is_active ? "text-danger hover:text-red-800" : "text-success hover:text-green-800"} font-medium`}>
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {vendors.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No vendors found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "printers" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px] whitespace-nowrap">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {printers.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-medium text-neutral-900">{p.username}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{new Date(p.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => togglePrinter(p)} className={`${p.is_active ? "text-danger" : "text-success"} font-medium`}>
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {printers.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No printers.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "guards" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px] whitespace-nowrap">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Zones</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {guards.map((g) => (
                  <tr key={g.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-medium text-neutral-900">{g.username}</td>
                    <td className="px-6 py-4 text-neutral-600">
                      <div className="flex flex-wrap gap-1">
                        {(g.guard_zones || []).map((gz: any) => (
                          <span key={gz.zone_id} className="px-2 py-0.5 rounded text-[12px] bg-neutral-100">
                            {gz.zones?.name}
                          </span>
                        ))}
                        {(!g.guard_zones || g.guard_zones.length === 0) && (
                          <span className="italic text-neutral-400 text-[12px]">No zones</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${g.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {g.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => toggleGuard(g)} className={`${g.is_active ? "text-danger" : "text-success"} font-medium`}>
                        {g.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
                {guards.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No guards.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Dialogs ── */}
      <Dialog
        isOpen={isQuotaOpen}
        onClose={() => setIsQuotaOpen(false)}
        title="Edit Application Quota"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsQuotaOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={saveQuota} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Set the max submissions for <span className="font-semibold text-neutral-900">{selectedUser?.org_name}</span>.
          </p>
          <Input label="Application Quota" type="number" min="0" value={newQuota} onChange={(e) => setNewQuota(e.target.value)} disabled={isSubmitting} />
        </div>
      </Dialog>

      <Dialog
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        title="Invite New Vendor"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddVendorOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddVendor} disabled={isSubmitting || !newVendor.email || !newVendor.orgName}>
              {isSubmitting ? "Inviting..." : "Send Invitation"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Organisation Name" value={newVendor.orgName} onChange={(e) => setNewVendor({ ...newVendor, orgName: e.target.value })} />
          <Input label="Email" type="email" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
          <Input label="Initial Quota" type="number" min="1" value={newVendor.quota} onChange={(e) => setNewVendor({ ...newVendor, quota: e.target.value })} />
        </div>
      </Dialog>

      <Dialog
        isOpen={isAddPrinterOpen}
        onClose={() => setIsAddPrinterOpen(false)}
        title="Invite New Printer"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddPrinterOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddPrinter} disabled={isSubmitting || !newPrinter.email}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <Input label="Email" type="email" value={newPrinter.email} onChange={(e) => setNewPrinter({ email: e.target.value })} />
      </Dialog>

      <Dialog
        isOpen={isAddGuardOpen}
        onClose={() => setIsAddGuardOpen(false)}
        title="Invite New Guard"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddGuardOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddGuard} disabled={isSubmitting || !newGuard.email}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={newGuard.email}
            onChange={(e) => setNewGuard({ ...newGuard, email: e.target.value })}
          />
          <div>
            <p className="text-[13px] font-medium text-neutral-900 mb-2">Allowed Zones</p>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-neutral-200 rounded-lg p-3">
              {zones.length === 0 && <p className="text-[13px] text-neutral-500">No zones defined yet.</p>}
              {zones.map((z) => (
                <label key={z.id} className="flex items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={newGuard.zoneIds.has(z.id)}
                    onChange={(e) => {
                      setNewGuard((g) => {
                        const next = new Set(g.zoneIds)
                        if (e.target.checked) next.add(z.id)
                        else next.delete(z.id)
                        return { ...g, zoneIds: next }
                      })
                    }}
                  />
                  {z.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk Import Vendors"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsImportOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              onClick={handleRunImport}
              disabled={isSubmitting || importPreview.length === 0}
            >
              {isSubmitting ? "Importing..." : `Import ${importPreview.length}`}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-neutral-600">
            CSV columns: <code>org_name, coordinator_name, email, designation, quota</code>
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleCSVPick(f)
            }}
            className="text-[13px]"
          />
          {importPreview.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-lg text-[12px]">
              <table className="w-full">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr><th className="px-2 py-1 text-left">Org</th><th className="px-2 py-1 text-left">Email</th><th className="px-2 py-1 text-left">Quota</th></tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className="px-2 py-1">{r.org_name}</td>
                      <td className="px-2 py-1">{r.email}</td>
                      <td className="px-2 py-1">{r.quota}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
