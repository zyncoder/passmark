import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[13px] font-medium text-neutral-700">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border-[1.5px] border-neutral-200 bg-white px-4 py-2 text-[15px] placeholder:text-neutral-400 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error && "border-danger focus-visible:border-danger focus-visible:ring-danger/10",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="text-[12px] text-danger font-medium">{error}</span>}
        {!error && helperText && <span className="text-[12px] text-neutral-500">{helperText}</span>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
