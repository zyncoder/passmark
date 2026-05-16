"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileUpload } from "@/components/ui/file-upload"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { enqueuePending } from "@/lib/vendor-outbox"

const idTypeOptions = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
]

// The schema is flexible enough to allow saving partial drafts
const formSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  designation: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  zones: z.array(z.string()).optional(),
  tcAccepted: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  applicationId?: string;
  isReadOnly?: boolean;
}

export function AccreditationForm({ applicationId, isReadOnly = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showPrompt, setShowPrompt] = React.useState(false)
  const [zones, setZones] = React.useState<any[]>([])
  const [photoFile, setPhotoFile] = React.useState<File | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = React.useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { zones: [], tcAccepted: false }
  })

  React.useEffect(() => {
    async function init() {
      // Load zones
      const { data: zonesData } = await supabase.from('zones').select('*')
      if (zonesData) setZones(zonesData)

      if (applicationId) {
        // Load application
        const { data: appData, error } = await supabase.from('applications').select('*').eq('id', applicationId).single()
        if (appData) {
          setValue('firstName', appData.first_name || '')
          setValue('lastName', appData.last_name || '')
          setValue('designation', appData.designation || '')
          setValue('mobile', appData.mobile || '')
          setValue('email', appData.email || '')
          setValue('idType', appData.id_type || '')
          setValue('idNumber', appData.id_number || '')
          if (appData.photo_url) setExistingPhotoUrl(appData.photo_url)

          // Load app zones
          const { data: appZones } = await supabase.from('application_zones').select('zone_id').eq('application_id', applicationId)
          if (appZones) {
            setValue('zones', appZones.map((z: any) => z.zone_id))
          }
        }
      }
      setIsLoading(false)
    }
    init()
  }, [applicationId, supabase, setValue])

  const validateForSubmit = (data: FormValues) => {
    const errors: string[] = []
    if (!data.firstName) errors.push("First name is required")
    if (!data.lastName) errors.push("Last name is required")
    if (!data.mobile || !/^[0-9]{10}$/.test(data.mobile)) errors.push("Valid 10-digit mobile is required")
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) errors.push("Valid email is required")
    if (!data.idType) errors.push("ID Type is required")
    if (!data.idNumber) errors.push("ID Number is required")
    if (!data.tcAccepted) errors.push("You must accept the Terms and Conditions")
    if (!photoFile && !existingPhotoUrl) errors.push("Photo upload is required")
    
    if (errors.length > 0) {
      errors.forEach(e => addToast(e, "error"))
      return false
    }
    return true
  }

  const saveApplication = async (data: FormValues, status: 'DRAFT' | 'SUBMITTED') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get active event
    const { data: eventData } = await supabase.from('events').select('id').eq('is_active', true).single()
    const eventId = eventData?.id

    const appPayload = {
      event_id: eventId,
      user_id: user.id,
      status,
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      designation: data.designation || null,
      mobile: data.mobile || null,
      email: data.email || null,
      id_type: data.idType || null,
      id_number: data.idNumber || null,
      updated_at: new Date().toISOString(),
      ...(status === 'SUBMITTED' ? { submitted_at: new Date().toISOString() } : {})
    }

    let savedAppId = applicationId

    if (applicationId) {
      await supabase.from('applications').update(appPayload).eq('id', applicationId)
    } else {
      const { data: newApp, error } = await supabase.from('applications').insert(appPayload).select().single()
      if (error) throw error
      savedAppId = newApp.id
    }

    if (!savedAppId) throw new Error("Failed to save application")

    // Save Zones
    if (applicationId) {
      await supabase.from('application_zones').delete().eq('application_id', savedAppId)
    }
    if (data.zones && data.zones.length > 0) {
      const zoneInserts = data.zones.map(z => ({ application_id: savedAppId, zone_id: z }))
      await supabase.from('application_zones').insert(zoneInserts)
    }

    // Save Photo (Mocked for V1 if storage isn't fully set up, but we will try)
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const filePath = `${eventId}/${savedAppId}/photo.${ext}`
      const { error: uploadError } = await supabase.storage.from('application-photos').upload(filePath, photoFile, { upsert: true })
      
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('application-photos').getPublicUrl(filePath)
        await supabase.from('applications').update({ photo_url: urlData.publicUrl, photo_path: filePath }).eq('id', savedAppId)
      }
    }

    return savedAppId
  }

  const handleSaveDraft = async (data: FormValues) => {
    setIsSaving(true)
    try {
      const newId = await saveApplication(data, 'DRAFT')
      addToast("Draft saved successfully", "success")
      if (!applicationId && newId) {
        router.push(`/form/${newId}/edit`)
      }
    } catch (e: any) {
      addToast(e.message || "Failed to save draft", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitFinal = async (data: FormValues) => {
    if (!validateForSubmit(data)) return

    setIsSubmitting(true)
    try {
      // Save as DRAFT first so the application row exists even if the submit
      // round-trip fails offline. Then attempt to finalise on the server.
      const id = await saveApplication(data, 'DRAFT')
      if (!id) throw new Error("Save failed")

      try {
        const res = await fetch(`/api/vendor/applications/${id}/submit`, { method: "POST" })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "submit failed")
      } catch (err) {
        // Network down or server errored — queue the submission and tell
        // the SW to retry it via Background Sync.
        await enqueuePending(id)
        try {
          const reg = await navigator.serviceWorker?.ready
          const sync = (reg as unknown as { sync?: { register(tag: string): Promise<void> } })?.sync
          if (sync) await sync.register("passmark-form-sync")
        } catch {}
        addToast("Queued — will submit when online", "success")
      }

      setShowPrompt(true)
    } catch (e: any) {
      addToast(e.message || "Failed to submit application", "error")
      setIsSubmitting(false)
    }
  }

  const handlePromptChoice = (fillAnother: boolean) => {
    setShowPrompt(false)
    if (fillAnother) {
      router.push("/form/new")
      router.refresh()
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  const selectedZones = watch("zones") || []

  if (isLoading) return <div className="p-8">Loading form...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32">
      <div className="pt-4 px-4 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {isReadOnly ? "View Application" : applicationId ? "Edit Application" : "New Application"}
        </h1>
        {applicationId && <p className="text-[14px] text-neutral-600">Ref: {applicationId.split('-')[0].toUpperCase()}</p>}
      </div>

      <form className="space-y-6 px-4 sm:px-0">
        {/* Section 1: Personal */}
        <section className="space-y-4">
          <h2 className="text-[18px] font-semibold text-neutral-900">Personal Information</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First Name" disabled={isReadOnly} {...register("firstName")} />
                <Input label="Last Name" disabled={isReadOnly} {...register("lastName")} />
              </div>
              <Input label="Designation" disabled={isReadOnly} {...register("designation")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Mobile Number" disabled={isReadOnly} {...register("mobile")} />
                <Input label="Email ID" type="email" disabled={isReadOnly} {...register("email")} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 2: ID */}
        <section className="space-y-4">
          <h2 className="text-[18px] font-semibold text-neutral-900">Identification</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="ID Type"
                  disabled={isReadOnly}
                  options={[{ value: "", label: "Select ID Type" }, ...idTypeOptions]}
                  {...register("idType")}
                />
                <Input label="ID Card Number" disabled={isReadOnly} {...register("idNumber")} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Zones */}
        <section className="space-y-4">
          <h2 className="text-[18px] font-semibold text-neutral-900">Access Zones Request</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {zones.map(z => (
                  <Checkbox
                    key={z.id}
                    label={z.name}
                    disabled={isReadOnly}
                    checked={selectedZones.includes(z.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue("zones", [...selectedZones, z.id])
                      } else {
                        setValue("zones", selectedZones.filter(id => id !== z.id))
                      }
                    }}
                  />
                ))}
                {zones.length === 0 && <p className="text-[13px] text-neutral-600">No zones available.</p>}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Photo */}
        <section className="space-y-4">
          <h2 className="text-[18px] font-semibold text-neutral-900">Applicant Photo</h2>
          <Card>
            <CardContent className="p-6">
              {existingPhotoUrl && !photoFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-40 bg-neutral-100 border border-neutral-300 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={existingPhotoUrl} alt="Photo" className="w-full h-full object-cover" />
                  </div>
                  {!isReadOnly && (
                    <Button variant="secondary" onClick={() => setExistingPhotoUrl(null)}>Change Photo</Button>
                  )}
                </div>
              ) : (
                <FileUpload
                  value={photoFile}
                  onChange={setPhotoFile}
                  disabled={isReadOnly}
                  accept="image/jpeg, image/png"
                  maxSizeMB={2}
                />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 5: T&C */}
        {!isReadOnly && (
          <section className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <Checkbox
                  label="I agree to the Terms and Conditions and confirm the provided information is correct."
                  checked={watch("tcAccepted")}
                  onChange={(e) => setValue("tcAccepted", e.target.checked, { shouldValidate: true })}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </form>

      {/* Sticky Bottom Bar */}
      {!isReadOnly && (
        <div className="fixed bottom-0 sm:bottom-0 left-0 sm:left-64 right-0 bg-white border-t border-neutral-300 p-4 flex justify-end gap-3 z-40">
          <Button variant="secondary" onClick={handleSubmit(handleSaveDraft)} disabled={isSaving || isSubmitting}>
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button onClick={handleSubmit(handleSubmitFinal)} disabled={isSaving || isSubmitting || !watch("tcAccepted")}>
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      )}

      {/* Post-Submit Prompt */}
      <Dialog
        isOpen={showPrompt}
        onClose={() => handlePromptChoice(false)}
        title="Application Submitted!"
        footer={
          <>
            <Button variant="secondary" onClick={() => handlePromptChoice(false)}>Return to Dashboard</Button>
            <Button onClick={() => handlePromptChoice(true)}>Fill Another Form</Button>
          </>
        }
      >
        <p className="text-[14px] text-neutral-600">
          Your application has been successfully submitted. Do you want to fill another application?
        </p>
      </Dialog>
    </div>
  )
}
