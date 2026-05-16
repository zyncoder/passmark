"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"
import { useToast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const supabase = createClient()
  const { addToast } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      addToast(error.message, "error")
      setIsLoading(false)
      return
    }

    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: adminData } = await supabase.from('admins').select('id').eq('id', user.id).single()
      if (adminData) {
        router.push("/admin/dashboard")
        router.refresh()
      } else {
        await supabase.auth.signOut()
        addToast("Unauthorized: Admins only", "error")
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand text-center">Passmark Admin</h1>
          <p className="mt-2 text-[14px] text-neutral-600 text-center">
            Sign in to access the control panel.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Email address"
            type="email"
            placeholder="admin@passmark.in"
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
