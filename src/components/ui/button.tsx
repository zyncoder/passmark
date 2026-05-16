import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "danger" | "ghost"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl px-5 h-11 text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]",
          {
            "bg-brand text-white hover:bg-brand-dark shadow-sm": variant === "default",
            "border-[1.5px] border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-300": variant === "secondary",
            "bg-danger text-white hover:bg-[#B91C1C] shadow-sm": variant === "danger",
            "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900": variant === "ghost",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
