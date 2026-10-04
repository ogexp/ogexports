import { ReactNode, useState } from "react"
import { useGetMe } from "@workspace/api-client-react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShieldAlert } from "lucide-react"
import { useLocation } from "wouter"

interface KycGateButtonProps extends ButtonProps {
  children: ReactNode
  actionName?: string
}

export function KycGateButton({ children, actionName = "perform this action", onClick, ...props }: KycGateButtonProps) {
  const { data: me } = useGetMe()
  const isVerified = me?.kycStatus === "verified"
  const [open, setOpen] = useState(false)
  const [, setLocation] = useLocation()

  if (isVerified) {
    return <Button onClick={onClick} {...props}>{children}</Button>
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
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Verification Required
            </DialogTitle>
            <DialogDescription>
              You must complete identity verification to {actionName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              As a compliant trading platform, we require all active participants to be fully verified before creating listings, negotiating quotes, executing contracts, or processing payments.
            </p>
            <Button 
              className="w-full" 
              onClick={() => {
                setOpen(false)
                setLocation("/account")
              }}
            >
              Complete Verification Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
