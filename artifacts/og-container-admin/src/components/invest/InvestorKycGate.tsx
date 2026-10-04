import { ReactNode, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "wouter"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShieldAlert, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

type InvestorKycGateProps = ButtonProps & {
  children: ReactNode
  actionName?: string
  /** When true, render children only if KYC approved; otherwise show gated button */
  asChild?: never
}

export function useInvestorKycApproved() {
  const { data, isLoading } = useQuery({
    queryKey: ["investor", "dashboard"],
    queryFn: () => api.get<{ data: { kyc_status?: string | null; kyc_approved?: boolean } }>("/api/investor/dashboard"),
  })

  const status = data?.data?.kyc_status ?? "missing"
  const approved = data?.data?.kyc_approved === true || status === "approved"

  return { approved, status, isLoading }
}

/**
 * Gates investment actions until admin-approved KYC.
 * Shows a verification dialog linking to /invest/kyc when not approved.
 */
export function InvestorKycGate({
  children,
  actionName = "invest",
  onClick,
  ...props
}: InvestorKycGateProps) {
  const { approved, isLoading } = useInvestorKycApproved()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <Button disabled {...props}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Checking KYC…
      </Button>
    )
  }

  if (approved) {
    return (
      <Button onClick={onClick} {...props}>
        {children}
      </Button>
    )
  }

  return (
    <>
      <Button
        {...props}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              KYC Verification Required
            </DialogTitle>
            <DialogDescription>
              You must complete KYC and get admin approval before you can {actionName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Upload your identity and compliance documents on the KYC page. Once an admin
              approves your application, investment actions will be unlocked.
            </p>
            <Button className="w-full" asChild onClick={() => setOpen(false)}>
              <Link href="/invest/kyc">Complete KYC Now</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Inline banner for pages that show invest CTAs when KYC is incomplete. */
export function InvestorKycRequiredBanner() {
  const { approved, isLoading } = useInvestorKycApproved()

  if (isLoading || approved) return null

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>KYC Unverified.</strong> Complete identity verification and wait for admin
          approval before making investments.
        </span>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 border-red-500/40 text-red-700" asChild>
        <Link href="/invest/kyc">Go to KYC</Link>
      </Button>
    </div>
  )
}
