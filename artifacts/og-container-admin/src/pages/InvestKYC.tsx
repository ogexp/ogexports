import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "wouter"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { InvestKycMinimalLayout } from "@/components/invest/InvestKycMinimalLayout"
import { useInvestorKycApproved } from "@/components/invest/InvestorKycGate"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  ShieldCheck, FileText, Upload, CheckCircle2, Clock, AlertCircle,
  Eye, Lock, HelpCircle, Mail, Loader2,
} from "lucide-react"
import { api, resolveAttachmentUrl } from "@/lib/api"
import { notify } from "@/lib/notify"

type KycDocument = {
  id: number
  path?: string | null
  url?: string | null
  original_name?: string | null
}

type KycStep = {
  key?: string
  doc_type: string
  label: string
  status: string
  desc?: string
  uploaded_at?: string | null
  document_id?: number | null
  document?: KycDocument | null
}

type ProfileKyc = {
  status?: string
  application_id?: number | null
  application?: { id: number; status: string; notes?: string | null } | null
  steps?: KycStep[]
}

const STEP_META: Record<string, {
  label: string
  cls: string
  cardCls: string
  iconCls: string
  icon: React.ElementType
}> = {
  verified: {
    label: "Verified",
    cls: "text-emerald-600",
    cardCls: "border-emerald-500/20 bg-emerald-500/5",
    iconCls: "bg-emerald-500/15",
    icon: CheckCircle2,
  },
  review: {
    label: "Under Review",
    cls: "text-amber-600",
    cardCls: "border-amber-500/30 bg-amber-500/5",
    iconCls: "bg-amber-500/15",
    icon: Clock,
  },
  pending: {
    label: "Unverified",
    cls: "text-red-600",
    cardCls: "border-red-500/30 bg-red-500/5",
    iconCls: "bg-red-500/15",
    icon: AlertCircle,
  },
  rejected: {
    label: "Rejected",
    cls: "text-red-600",
    cardCls: "border-red-500/30 bg-red-500/5",
    iconCls: "bg-red-500/15",
    icon: AlertCircle,
  },
}

const DOC_STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  verified: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  review: { label: "Under Review", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  pending: { label: "Unverified", cls: "bg-red-500/15 text-red-600", icon: AlertCircle },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-500", icon: AlertCircle },
}

const FALLBACK_STEPS: KycStep[] = [
  { doc_type: "passport_id", label: "Passport / National ID", status: "pending", desc: "Government-issued ID (CNIC, Passport, or National ID)" },
  { doc_type: "proof_of_address", label: "Proof of Address", status: "pending", desc: "Utility bill, bank statement, or official letter (last 3 months)" },
  { doc_type: "tax_certificate", label: "Tax Certificate / NTN", status: "pending", desc: "Tax certificate, NTN, or equivalent tax registration" },
]

function bannerMeta(status: string, hasUploads: boolean) {
  if (status === "approved") {
    return {
      badge: "KYC Verified",
      badgeCls: "bg-emerald-500/15 text-emerald-600 border-0",
      borderCls: "border-emerald-500/30",
      iconCls: "bg-emerald-500/15 text-emerald-500",
      barCls: "bg-emerald-500",
      hint: "Your identity has been verified. You can browse and make investments.",
    }
  }
  if (status === "rejected") {
    return {
      badge: "KYC Rejected",
      badgeCls: "bg-red-500/15 text-red-600 border-0",
      borderCls: "border-red-500/30",
      iconCls: "bg-red-500/15 text-red-500",
      barCls: "bg-red-500",
      hint: "Your previous submission was rejected. Please re-upload the required documents.",
    }
  }
  if (hasUploads || status === "pending" || status === "review") {
    return {
      badge: "Under Review",
      badgeCls: "bg-amber-500/15 text-amber-600 border-0",
      borderCls: "border-amber-500/30",
      iconCls: "bg-amber-500/15 text-amber-500",
      barCls: "bg-amber-500",
      hint: "Documents are under compliance review. Verification usually takes 1–2 business days.",
    }
  }
  return {
    badge: "KYC Unverified",
    badgeCls: "bg-red-500/15 text-red-600 border-0",
    borderCls: "border-red-500/30",
    iconCls: "bg-red-500/15 text-red-500",
    barCls: "bg-red-500",
    hint: "Upload the required documents below. Admin approval is required before you can invest.",
  }
}

function KycPageShell({
  approved,
  kycStatus,
  children,
}: {
  approved: boolean
  kycStatus: string
  children: ReactNode
}) {
  if (approved) {
    return (
      <InvestPortalLayout title="KYC & Document Center" subtitle="Identity verification and compliance documentation">
        {children}
      </InvestPortalLayout>
    )
  }

  return (
    <InvestKycMinimalLayout kycStatus={kycStatus}>
      {children}
    </InvestKycMinimalLayout>
  )
}

export default function InvestKYC() {
  const queryClient = useQueryClient()
  const { approved: dashApproved, status: dashStatus, isLoading: dashLoading } = useInvestorKycApproved()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [kyc, setKyc] = useState<ProfileKyc | null>(null)
  const [pct, setPct] = useState(0)
  const [selectedDoc, setSelectedDoc] = useState("passport_id")
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: { kyc?: ProfileKyc; verification_pct?: number } }>("/api/investor/profile")
      const nextKyc = res?.data?.kyc || null
      setKyc(nextKyc)
      setPct(Number(res?.data?.verification_pct ?? 0))
      const firstPending = (nextKyc?.steps || []).find(s => s.status === "pending" || s.status === "rejected")
      if (firstPending?.doc_type) setSelectedDoc(firstPending.doc_type)
    } catch (e: any) {
      notify.error(e?.message || "Failed to load KYC status")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Refresh when admin approves (or user returns to tab) so layout unlocks without re-login
  useEffect(() => {
    const onKyc = () => {
      void load()
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
    }
    const onFocus = () => {
      void load()
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
    }
    window.addEventListener("og-kyc-updated", onKyc)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("og-kyc-updated", onKyc)
      window.removeEventListener("focus", onFocus)
    }
  }, [load, queryClient])

  const steps = useMemo(() => {
    const list = Array.isArray(kyc?.steps) && kyc!.steps!.length > 0 ? kyc!.steps! : FALLBACK_STEPS
    return list.map(s => ({
      ...s,
      doc_type: s.doc_type || s.key || "",
    }))
  }, [kyc])

  const uploadedDocs = useMemo(
    () => steps.filter(s => s.document),
    [steps],
  )

  const appStatus = kyc?.status || dashStatus || "missing"
  // Align with InvestorKycRouteGate (dashboard) so meta-approved users get the portal layout
  const kycApproved = dashApproved || appStatus === "approved"
  const hasUploads = uploadedDocs.length > 0
  const banner = bannerMeta(kycApproved ? "approved" : appStatus, hasUploads)
  const verifiedCount = steps.filter(s => s.status === "verified").length
  const reviewCount = steps.filter(s => s.status === "review").length
  const progressPct = kycApproved
    ? 100
    : pct || Math.round(((verifiedCount + reviewCount) / Math.max(steps.length, 1)) * 100)

  // Avoid flashing the minimal (no-sidebar) shell on first paint only
  if ((dashLoading || loading) && kyc === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading KYC status…
      </div>
    )
  }

  async function handleUpload(file?: File | null) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      notify.error("File must be under 10 MB")
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "kyc")
      const uploaded = await api.upload<{ data: { path: string; name?: string } }>("/api/uploads", fd)
      const res = await api.post<{ data: { kyc?: ProfileKyc } }>("/api/investor/profile/kyc/upload", {
        doc_type: selectedDoc,
        path: uploaded.data.path,
        original_name: uploaded.data.name || file.name,
      })
      if (res?.data?.kyc) {
        setKyc(res.data.kyc)
        const nextSteps = res.data.kyc.steps || []
        const done = nextSteps.filter(s => s.status === "verified" || s.status === "review").length
        setPct(Math.round((done / Math.max(nextSteps.length, 1)) * 100))
      } else {
        await load()
      }
      await queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
      window.dispatchEvent(new Event("og-kyc-updated"))
      notify.success("Document uploaded for review")
    } catch (e: any) {
      notify.error(e?.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <KycPageShell approved={kycApproved} kycStatus={kycApproved ? "approved" : appStatus}>
      <div className="space-y-8">
        <Card className={`glass-card overflow-hidden relative ${banner.borderCls}`}>
          <CardContent className="p-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${banner.iconCls}`}>
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading font-bold text-lg">KYC Status</h2>
                    <Badge className={`text-xs ${banner.badgeCls}`}>● {banner.badge}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {kycApproved
                      ? `${verifiedCount} of ${steps.length} steps verified · 100% complete`
                      : `${verifiedCount} verified · ${reviewCount} under review · ${progressPct}% submitted`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{banner.hint}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-heading font-bold">{progressPct}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
            <div className="mt-5 h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${banner.barCls}`} style={{ width: `${progressPct}%` }} />
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Verification Steps</h3>
            {steps.map(step => {
              const meta = STEP_META[step.status] || STEP_META.pending
              const Icon = meta.icon
              return (
                <div key={step.doc_type} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${meta.cardCls}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.iconCls}`}>
                    <Icon className={`w-4 h-4 ${meta.cls}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold">{step.label}</span>
                      <span className={`text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              )
            })}

            <Card className="glass-card mt-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold">Need Help?</span>
                </div>
                <p className="text-xs text-muted-foreground">Our compliance team is available to assist with your KYC process.</p>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <a href="mailto:info@ogexports.co">
                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Contact Compliance
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Document Center</h3>

            {!kycApproved && (
              <Card className="glass-card border-dashed border-2">
                <CardContent className="p-6">
                  <h4 className="text-sm font-semibold mb-4">Upload Document</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Document Type</Label>
                      <select
                        className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:border-accent"
                        value={selectedDoc}
                        onChange={e => setSelectedDoc(e.target.value)}
                      >
                        {steps.map(s => (
                          <option key={s.doc_type} value={s.doc_type}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={e => void handleUpload(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors disabled:opacity-60"
                    >
                      {uploading
                        ? <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
                        : <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />}
                      <p className="text-sm font-medium">{uploading ? "Uploading…" : "Click to upload or drag and drop"}</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG — max 10 MB</p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {kycApproved && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="flex-1">KYC verified — you can now invest. Browse opportunities from your dashboard.</span>
                <Button size="sm" variant="outline" className="ml-auto" asChild>
                  <Link href="/invest/opportunities">View Opportunities</Link>
                </Button>
              </div>
            )}

            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="font-heading text-base">Uploaded Documents</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {uploadedDocs.length} document{uploadedDocs.length === 1 ? "" : "s"} on file
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {uploadedDocs.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                    No documents uploaded yet. Select a document type and upload to begin verification.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {uploadedDocs.map(step => {
                      const meta = DOC_STATUS_META[step.status] || DOC_STATUS_META.pending
                      const fileUrl = resolveAttachmentUrl(step.document?.path, step.document?.url)
                      return (
                        <div key={step.doc_type} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {step.document?.original_name || step.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{step.label}</p>
                            {step.uploaded_at && (
                              <p className="text-[10px] text-muted-foreground">Uploaded {step.uploaded_at}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`text-[10px] border-0 flex items-center gap-1 ${meta.cls}`}>
                              <meta.icon className="w-2.5 h-2.5" />{meta.label}
                            </Badge>
                            {fileUrl && (
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="View document"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>All documents are encrypted at rest and in transit. Your personal information is handled in accordance with our Privacy Policy and applicable data protection laws.</span>
            </div>
          </div>
        </div>
      </div>
    </KycPageShell>
  )
}
