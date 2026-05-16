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
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

const idTypeOptions = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
]

const registerSchema = z.object({
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional(),
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  mobile: z.string().regex(/^[0-9]{10}$/, "Mobile number must be exactly 10 digits"),
  landline: z.string().optional(),
  email: z.string().email("Please enter a valid email address."),
  idType: z.string().min(1, "ID Type is required"),
  idNumber: z.string().min(1, "ID Number is required"),
  tcAccepted: z.boolean().refine((val) => val === true, "You must accept the Terms and Conditions"),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [profile, setProfile] = React.useState<any>(null)
  const supabase = createClient()
  const { addToast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      tcAccepted: false,
    }
  })

  React.useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) {
        addToast("Failed to load profile", "error")
        return
      }

      if (data.is_registered) {
        router.push("/dashboard")
        return
      }

      setProfile(data)
      // Pre-fill email from auth user if needed, or from profile username
      setValue("email", user.email || "")
    }

    loadProfile()
  }, [supabase, router, addToast, setValue])

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { error } = await supabase
      .from("vendor_profiles")
      .update({
        address_line1: data.addressLine1,
        address_line2: data.addressLine2,
        first_name: data.firstName,
        last_name: data.lastName,
        mobile: data.mobile,
        landline: data.landline,
        id_type: data.idType,
        id_number: data.idNumber,
        tc_accepted: data.tcAccepted,
        is_registered: true,
      })
      .eq("id", user.id)

    if (error) {
      addToast(error.message, "error")
      setIsLoading(false)
    } else {
      addToast("Registration complete", "success")
      router.push("/dashboard")
    }
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="sticky top-0 z-10 bg-neutral-50 pb-4 pt-2 border-b border-neutral-300">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Complete your profile</h1>
          <p className="text-[14px] text-neutral-600">Complete your profile to continue to the dashboard.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Organisation Details */}
          <section className="space-y-4">
            <h2 className="text-[18px] font-semibold text-neutral-900">Organisation Details</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-neutral-900">Organisation Name</label>
                  <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-brand-light text-brand text-[14px] font-medium w-fit border border-neutral-200">
                    {profile.org_name}
                  </div>
                </div>

                <Input
                  label="Address Line 1"
                  placeholder="Enter building, street, etc."
                  error={errors.addressLine1?.message}
                  {...register("addressLine1")}
                  disabled={isLoading}
                />
                
                <Input
                  label="Address Line 2 (Optional)"
                  placeholder="Enter area, landmark, etc."
                  error={errors.addressLine2?.message}
                  {...register("addressLine2")}
                  disabled={isLoading}
                />
              </CardContent>
            </Card>
          </section>

          {/* Section 2: Coordinator Details */}
          <section className="space-y-4">
            <h2 className="text-[18px] font-semibold text-neutral-900">Coordinator Details</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="First name"
                    error={errors.firstName?.message}
                    {...register("firstName")}
                    disabled={isLoading}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Last name"
                    error={errors.lastName?.message}
                    {...register("lastName")}
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Mobile Number"
                    placeholder="10-digit number"
                    error={errors.mobile?.message}
                    {...register("mobile")}
                    disabled={isLoading}
                  />
                  <Input
                    label="Landline Number (Optional)"
                    placeholder="With STD code"
                    error={errors.landline?.message}
                    {...register("landline")}
                    disabled={isLoading}
                  />
                </div>

                <Input
                  label="Email ID"
                  type="email"
                  placeholder="name@organization.com"
                  error={errors.email?.message}
                  {...register("email")}
                  disabled={isLoading}
                />

                <div className="flex flex-col gap-1">
                  <label className="text-[13px] font-medium text-neutral-900">Designation</label>
                  <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-brand-light text-brand text-[14px] font-medium w-fit border border-neutral-200">
                    {profile.designation || "Not specified"}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="ID Type"
                    options={[
                      { value: "", label: "Select ID Type" },
                      ...idTypeOptions
                    ]}
                    error={errors.idType?.message}
                    {...register("idType")}
                    disabled={isLoading}
                  />
                  <Input
                    label="ID Card Number"
                    placeholder="Enter ID number"
                    error={errors.idNumber?.message}
                    {...register("idNumber")}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 3: Terms and Conditions */}
          <section className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="h-40 overflow-y-auto p-4 border border-neutral-300 rounded-lg bg-neutral-50 text-[13px] text-neutral-600">
                  <p className="font-semibold text-black mb-2">Terms and Conditions</p>
                  <p className="mb-2">1. By submitting this application, you confirm that all information provided is accurate and truthful.</p>
                  <p className="mb-2">2. Accreditation passes are non-transferable and must be worn visibly at all times during the event.</p>
                  <p className="mb-2">3. The event organizers reserve the right to revoke accreditation without notice if the holder breaches any security protocols or codes of conduct.</p>
                  <p>4. You consent to background checks being performed using the ID details provided.</p>
                </div>
                
                <div>
                  <Checkbox
                    label="I have read and agree to the Terms and Conditions"
                    {...register("tcAccepted")}
                    checked={watch("tcAccepted")}
                    onChange={(e) => setValue("tcAccepted", e.target.checked, { shouldValidate: true })}
                    disabled={isLoading}
                  />
                  {errors.tcAccepted && (
                    <span className="text-[12px] text-danger block mt-1">{errors.tcAccepted.message}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isLoading || !watch("tcAccepted")}>
              {isLoading ? "Submitting..." : "Complete Registration"}
            </Button>
          </section>
        </form>
      </div>
    </div>
  )
}
