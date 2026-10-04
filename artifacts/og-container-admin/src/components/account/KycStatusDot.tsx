import { cn } from "@/lib/utils"

interface KycStatusDotProps {
  status: string | null | undefined
  className?: string
}

export function KycStatusDot({ status, className }: KycStatusDotProps) {
  if (!status) return null

  const isVerified = status === "verified"
  const isPendingOrRejected = status === "pending" || status === "rejected" || status === "unsubmitted"

  return (
    <div
      className={cn(
        "w-2.5 h-2.5 rounded-full border border-background shadow-sm ring-1",
        isVerified && "bg-emerald-500 ring-emerald-500/50",
        isPendingOrRejected && "bg-amber-500 ring-amber-500/50",
        className
      )}
      title={isVerified ? "Verified" : "Verification pending or unsubmitted"}
    />
  )
}
