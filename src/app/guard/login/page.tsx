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
import { InstallPrompt } from "@/components/InstallPrompt"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default function GuardLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { addToast } = useToast()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
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
    const { data: guard } = await supabase.from("guards").select("id, is_active").eq("id", user.id).maybeSingle()
    if (!guard || !guard.is_active) {
      await supabase.auth.signOut()
      addToast("This account is not a guard", "error")
      setIsLoading(false)
      return
    }
    router.push("/guard/zone")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm space-y-6 bg-neutral-800/60 backdrop-blur p-6 rounded-2xl border border-white/10">
        <div className="flex flex-col items-center gap-2">
          <Logo size={40} textClassName="text-white" />
          <p className="text-[14px] text-white/60">Guard scanner sign-in</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="guard@event.in"
            error={errors.email?.message}
            {...register("email")}
            disabled={isLoading}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              error={errors.password?.message}
              {...register("password")}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-neutral-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
      <InstallPrompt context="guard" />
    </div>
  )
}
