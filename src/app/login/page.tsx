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
import { Dialog } from "@/components/ui/dialog"
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
  const [showResetDialog, setShowResetDialog] = React.useState(false)
  const [resetEmail, setResetEmail] = React.useState("")
  const [isResetting, setIsResetting] = React.useState(false)
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
    router.push("/dashboard")
    router.refresh()
  }

  const handleResetPassword = async () => {
    if (!resetEmail) {
      addToast("Please enter your email address", "error")
      return
    }
    setIsResetting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const result = await res.json()
      if (res.ok) {
        addToast("If an account exists, a reset link has been sent to your email.", "success")
        setShowResetDialog(false)
        setResetEmail("")
      } else {
        addToast(result.error || "Failed to send reset email", "error")
      }
    } catch {
      addToast("Something went wrong. Please try again.", "error")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left Panel: Brand ── */}
      <div className="hidden md:flex flex-col w-1/2 bg-brand p-12 text-white justify-between relative overflow-hidden">
        <div>
          <div className="mb-16">
            <Logo size={36} textClassName="text-white text-2xl" />
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-4">
            Credentials,<br />without the complexity.
          </h2>
          <p className="text-white/60 text-lg max-w-md leading-relaxed">
            The modern accreditation platform for event organizers. Manage vendor passes, access zones, and approvals effortlessly.
          </p>
        </div>

        <p className="text-white/30 text-sm">
          &copy; {new Date().getFullYear()} Passmark Platform
        </p>
        
        {/* Decorative elements */}
        <div className="absolute -right-32 -bottom-32 w-[500px] h-[500px] border border-white/10 rounded-full" />
        <div className="absolute -right-20 -bottom-20 w-[400px] h-[400px] border border-white/10 rounded-full" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-3xl rotate-12" />
      </div>

      {/* ── Right Panel: Form ── */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden mb-8">
            <Logo size={30} />
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Welcome back</h2>
            <p className="mt-2 text-[15px] text-neutral-500">
              Log in with the credentials sent to your email.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  className="absolute right-3 top-[36px] text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowResetDialog(true)}
                className="text-[13px] font-medium text-brand hover:text-brand-dark transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full h-12 text-[15px] rounded-xl" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </div>
      </div>

      {/* ── Password Reset Dialog ── */}
      <Dialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title="Reset your password"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowResetDialog(false)} disabled={isResetting}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !resetEmail}>
              {isResetting ? "Sending..." : "Send Reset Link"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[14px] text-neutral-500">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <Input
            label="Email address"
            type="email"
            placeholder="name@organization.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            disabled={isResetting}
          />
        </div>
      </Dialog>
    </div>
  )
}
