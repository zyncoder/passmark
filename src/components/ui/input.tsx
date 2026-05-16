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
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-[13px] font-medium text-neutral-900">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border-[1.5px] border-neutral-300 bg-white px-3 py-2 text-[15px] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-600 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-[rgba(27,79,216,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger focus-visible:border-danger focus-visible:ring-0",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="text-[12px] text-danger">{error}</span>}
        {!error && helperText && <span className="text-[12px] text-neutral-600">{helperText}</span>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
