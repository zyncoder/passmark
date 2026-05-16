import * as React from "react"
import { cn } from "@/lib/utils"

export type BadgeStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BadgeStatus;
}

const statusConfig: Record<BadgeStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-[#F3F4F6] text-[#6B7280]' },
  SUBMITTED: { label: 'Submitted', className: 'bg-[#EEF2FF] text-brand' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-[#FEF3C7] text-[#92400E]' },
  APPROVED: { label: 'Approved', className: 'bg-[#DCFCE7] text-success' },
  REJECTED: { label: 'Rejected', className: 'bg-[#FEE2E2] text-danger' },
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
