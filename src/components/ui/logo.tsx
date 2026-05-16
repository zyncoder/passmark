import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
  textClassName?: string
}

export function Logo({ size = 32, className, showText = true, textClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="Passmark"
        width={size}
        height={size}
        className="rounded-lg"
        priority
      />
      {showText && (
        <span className={cn("font-bold text-xl tracking-tight text-neutral-900", textClassName)}>
          Passmark
        </span>
      )}
    </div>
  )
}
