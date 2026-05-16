"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/ui/logo"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof schema>

export default function PrinterLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      addToast(result.error || "Login failed", "error")
      setIsLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: printer } = await supabase.from("printers").select("id").eq("id", user.id).maybeSingle()
    if (!printer) {
      await supabase.auth.signOut()
      addToast("Unauthorized: this account isn't a printer", "error")
      setIsLoading(false)
      return
    }
    router.push("/printer/queue")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
          <p className="text-[14px] text-neutral-500">Printer station sign-in.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Email address"
            type="email"
            placeholder="printer@event.in"
            error={errors.email?.message}
            {...register("email")}
            disabled={isLoading}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-neutral-600 hover:text-neutral-900"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
