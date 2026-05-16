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

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const supabase = createClient()
  const { addToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
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
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen bg-white md:bg-neutral-50">
      <div className="hidden md:flex flex-col w-1/2 bg-brand p-12 text-white justify-between relative overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Passmark</h1>
          <p className="text-brand-light mt-2 text-lg">Credentials, without the complexity.</p>
        </div>
        
        {/* Placeholder for illustration */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 md:rounded-2xl md:shadow-sm md:border md:border-neutral-100">
          <div className="md:hidden mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-brand">Passmark</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Welcome back</h2>
            <p className="mt-2 text-[14px] text-neutral-600">
              Log in with the credentials sent to your email.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="name@organization.com"
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
            </div>

            <div className="flex items-center justify-end">
              <a href="#" className="text-[13px] font-medium text-brand hover:text-brand-dark">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
