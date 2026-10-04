import { useEffect, useState, useRef } from "react"
import { notify } from "@/lib/notify"
import { useLocalAuth } from "@/lib/local-auth"
import { api, resolveMediaUrl, toStoredMediaPath, uploadProfileAvatar, removeProfileAvatar } from "@/lib/api"
import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Building2, MapPin, Phone, Mail, Globe, ShieldCheck,
  Upload, CheckCircle2, Clock, AlertCircle, Save, User, Camera, Loader2,
} from "lucide-react"

const SUPPLIER_COUNTRIES = [
  "Pakistan",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "China",
  "United Kingdom",
  "United States",
  "Germany",
  "Malaysia",
  "Kenya",
  "Indonesia",
  "Other",
]

type DocStep = {
  key: string
  label: string
  status: string
  uploaded_at?: string | null
}

const DOC_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  verified: { label: "Verified",  color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  pending:  { label: "Pending",   color: "bg-amber-500/15 text-amber-600 border-amber-500/30",       icon: Clock },
  rejected: { label: "Rejected",  color: "bg-red-500/15 text-red-600 border-red-500/30",             icon: AlertCircle },
  missing:  { label: "Required",  color: "bg-red-500/15 text-red-600 border-red-500/30",             icon: AlertCircle },
}

export default function SupplierProfile() {
  const { user, updateProfile, refreshUser } = useLocalAuth()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [avatarSaved, setAvatarSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocStep[]>([])
  const [verificationPct, setVerificationPct] = useState(0)
  const [kycAppStatus, setKycAppStatus] = useState<string>("missing")
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    companyName:  "",
    contactName:  "",
    email:        "",
    phone:        "",
    country:      "",
    city:         "",
    address:      "",
    website:      "",
    ntn:          "",
    description:  "",
  })

  async function loadProfile() {
    setLoading(true)
    try {
      const res: any = await api.get("/api/supplier/profile")
      const d = res?.data ?? res
      const company = d?.company || {}
      setForm({
        companyName: company.company_name || "",
        contactName: company.contact_name || user?.fullName || "",
        email: company.email || user?.email || "",
        phone: company.phone || "",
        country: company.country || "",
        city: company.city || "",
        address: company.address || "",
        website: company.website || "",
        ntn: company.ntn || "",
        description: company.description || "",
      })
      setAvatarUrl(company.avatar_url ? resolveMediaUrl(company.avatar_url) : "")
      setDocs(d?.kyc?.steps || [])
      setKycAppStatus(String(d?.kyc?.status || "missing"))
      setVerificationPct(Number(d?.verification_pct ?? 0))
    } catch (e: any) {
      notify.error(e?.message || "Unable to load profile")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.put("/api/supplier/profile", {
        name: form.contactName.trim(),
        phone: form.phone.trim(),
        company_name: form.companyName.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        website: form.website.trim(),
        ntn: form.ntn.trim(),
        description: form.description.trim(),
      })
      updateProfile({
        fullName: form.contactName.trim() || user?.fullName,
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        country: form.country.trim(),
      })
      await refreshUser()
      setSaved(true)
      notify.success(
        form.country.toLowerCase() === "pakistan"
          ? "Profile saved — amounts will show in PKR"
          : "Profile saved",
      )
    } catch (e: any) {
      notify.error(e?.message || "Unable to save profile")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarFile(file?: File) {
    if (!file) return
    try {
      const url = await uploadProfileAvatar(file)
      setAvatarUrl(url)
      setAvatarSaved(true)
      await refreshUser()
      notify.success("Photo updated")
      setTimeout(() => setAvatarSaved(false), 2000)
    } catch (e: any) {
      notify.error(e?.message || "Unable to upload photo")
    }
  }

  async function handleDocUpload(docType: string, file?: File) {
    if (!file) return
    setUploadingDoc(docType)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "kyc")
      const up: any = await api.upload("/api/uploads", fd)
      const path = toStoredMediaPath(up?.data?.path || up?.data?.url) || up?.data?.path
      if (!path) throw new Error("Upload failed")
      const res: any = await api.post("/api/supplier/profile/kyc/upload", {
        doc_type: docType,
        path,
        original_name: file.name,
      })
      setDocs(res?.data?.kyc?.steps || [])
      setKycAppStatus(String(res?.data?.kyc?.status || "missing"))
      if (res?.data?.verification_pct != null) setVerificationPct(Number(res.data.verification_pct))
      window.dispatchEvent(new Event("og-kyc-updated"))
      notify.success("Document uploaded for admin review")
    } catch (e: any) {
      notify.error(e?.message || "Unable to upload document")
    } finally {
      setUploadingDoc(null)
    }
  }

  const verifiedCount = docs.filter(d => d.status === "verified").length
  const kycApproved = kycAppStatus === "approved"
  const bannerLabel = kycApproved
    ? "Fully Verified Supplier"
    : kycAppStatus === "rejected"
      ? "KYC Rejected"
      : verificationPct > 0 || docs.some(d => d.status === "pending")
        ? "Partially Verified Supplier"
        : "Verification Required"
  const bannerHint = kycApproved
    ? "Your KYC documents have been approved by OG Exports."
    : kycAppStatus === "rejected"
      ? "Your KYC was rejected. Please re-upload the required documents."
      : `${verifiedCount} of ${docs.length || 5} documents verified — upload remaining docs to complete verification`

  if (loading) {
    return (
      <SupplierPortalLayout title="Company Profile" subtitle="Manage your supplier profile and verification documents">
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading profile…
        </div>
      </SupplierPortalLayout>
    )
  }

  return (
    <SupplierPortalLayout title="Company Profile" subtitle="Manage your supplier profile and verification documents">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="rounded-2xl border p-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: "hsl(155 60% 15% / 0.06)", borderColor: "hsl(155 60% 15% / 0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0F3D2E, #2d7a4f)" }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">{bannerLabel}</p>
              <p className="text-xs text-muted-foreground">
                {bannerHint}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-700" style={{ width: `${verificationPct}%` }} />
            </div>
            <span className="text-xs font-semibold text-emerald-700">{verificationPct}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Name</label>
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.companyName} onChange={e => set("companyName", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">NTN Number</label>
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.ntn} onChange={e => set("ntn", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      <User className="w-3 h-3 inline mr-1" />Contact Person
                    </label>
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.contactName} onChange={e => set("contactName", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      <Phone className="w-3 h-3 inline mr-1" />Phone Number
                    </label>
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      <Mail className="w-3 h-3 inline mr-1" />Email Address
                    </label>
                    <input className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm"
                      value={form.email} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      <Globe className="w-3 h-3 inline mr-1" />Website (Optional)
                    </label>
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.website} onChange={e => set("website", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      <Globe className="w-3 h-3 inline mr-1" />Country
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.country}
                      onChange={e => set("country", e.target.value)}
                    >
                      <option value="">Select country…</option>
                      {SUPPLIER_COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {form.country && !SUPPLIER_COUNTRIES.includes(form.country) && (
                        <option value={form.country}>{form.country}</option>
                      )}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pakistan → amounts shown in PKR on your dashboard and offers
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      <MapPin className="w-3 h-3 inline mr-1" />City / Region
                    </label>
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.city} onChange={e => set("city", e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Address</label>
                  <input className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.address} onChange={e => set("address", e.target.value)} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Description</label>
                  <textarea rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.description} onChange={e => set("description", e.target.value)} />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    {saved ? <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Saved</> : <><Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save Changes"}</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" /> Profile Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted flex items-center justify-center shrink-0">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      : <User className="w-9 h-9 text-muted-foreground" />
                    }
                  </div>
                  <label className="w-full cursor-pointer">
                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      {avatarSaved ? "Photo saved!" : "Upload Photo"}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => void handleAvatarFile(e.target.files?.[0])}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={() => {
                        void removeProfileAvatar().then(() => {
                          setAvatarUrl("")
                          void refreshUser()
                        })
                      }}
                      className="text-[11px] text-red-500 hover:text-red-600 transition-colors"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">JPG or PNG · Max 5 MB · Shown in sidebar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Verification Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {docs.map(doc => {
                  const st = DOC_STATUS[doc.status] || DOC_STATUS.missing
                  const Icon = st.icon
                  return (
                    <div key={doc.key} className="rounded-xl border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium leading-snug">{doc.label}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${st.color}`}>
                          <Icon className="w-2.5 h-2.5" /> {st.label}
                        </span>
                      </div>
                      {doc.uploaded_at && (
                        <p className="text-[10px] text-muted-foreground">Uploaded {doc.uploaded_at}</p>
                      )}
                      {(doc.status === "missing" || doc.status === "rejected") && (
                        <label className="w-full cursor-pointer">
                          <div className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all">
                            {uploadingDoc === doc.key
                              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                              : <><Upload className="w-3.5 h-3.5" /> Upload Document</>}
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            disabled={uploadingDoc === doc.key}
                            onChange={e => void handleDocUpload(doc.key, e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  All documents are reviewed within 2–3 business days
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SupplierPortalLayout>
  )
}
