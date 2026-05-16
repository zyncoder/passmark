import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BadgeStatus;
}

const statusConfig: Record<BadgeStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-neutral-100 text-neutral-600' },
  SUBMITTED: { label: 'Submitted', className: 'bg-brand-light text-brand' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
};

function Badge({ className, status, ...props }: BadgeProps) {
  const config = statusConfig[status];
  
  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap",
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </div>
  )
}

export { Badge }
