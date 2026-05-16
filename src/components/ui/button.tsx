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
          "inline-flex items-center justify-center rounded-lg px-5 h-10 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40 disabled:cursor-not-allowed",
          {
            "bg-brand text-white hover:bg-brand-dark": variant === "default",
            "border-[1.5px] border-brand text-brand hover:bg-brand-light": variant === "secondary",
            "bg-danger text-white hover:bg-[#B91C1C]": variant === "danger",
            "bg-transparent text-neutral-600 hover:bg-neutral-100": variant === "ghost",
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
