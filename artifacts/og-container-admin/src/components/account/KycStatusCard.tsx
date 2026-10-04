import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react"
import type { Me, KycSubmission } from "@workspace/api-client-react"

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock }> = {
  unsubmitted: { label: "Not Submitted", variant: "secondary", icon: Clock },
  pending: { label: "Under Review", variant: "secondary", icon: Clock },
  verified: { label: "Verified", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Action Needed", variant: "destructive", icon: ShieldAlert },
}

interface KycStatusCardProps {
  me: Me
  latestSubmission: KycSubmission | null
  onRetry?: () => void
}

export function KycStatusCard({ me, latestSubmission, onRetry }: KycStatusCardProps) {
  const meta = STATUS_META[me.kycStatus] ?? STATUS_META.unsubmitted
  const Icon = meta.icon

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading font-bold">Your Account</h1>
        <p className="text-muted-foreground">{me.email}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5 text-accent" />
            Verification Status
          </CardTitle>
          <Badge variant={meta.variant} data-testid="badge-kyc-status">{meta.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Account Type</div>
              <div className="font-medium capitalize">{me.accountType ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Entity Type</div>
              <div className="font-medium capitalize">{me.entityType ?? "—"}</div>
            </div>
          </div>

          {latestSubmission?.status === "rejected" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-destructive">
                {latestSubmission.reviewerNotes || "Your submission needs corrections. Please review and resubmit your documents."}
              </p>
              {onRetry && (
                <Button variant="destructive" size="sm" onClick={onRetry} data-testid="button-retry-kyc">
                  Resubmit Verification
                </Button>
              )}
            </div>
          )}

          {me.kycStatus === "pending" && (
            <p className="text-sm text-muted-foreground">
              We're reviewing your submission. This usually takes 1-2 business days for company accounts, or a few minutes for
              identity verification.
            </p>
          )}

          {me.kycStatus === "verified" && (
            <p className="text-sm text-muted-foreground">
              You're verified. Buyer, supplier, and investor portals are rolling out soon — check back here for updates.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
