import { useEffect, useState } from "react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User, Building2, MapPin, FileText, CreditCard,
  ShieldCheck, Upload, CheckCircle2, AlertCircle, Edit2, Save, Loader2, Plus, Trash2,
} from "lucide-react"
import { api, toStoredMediaPath } from "@/lib/api"
import { useLocalAuth } from "@/lib/local-auth"
import { notify } from "@/lib/notify"
import {
  type InvestorBankAccount,
  createEmptyBankAccount,
  ensureDefaultBankAccount,
  hasUsableBankAccount,
  normalizeBankAccount,
} from "@/lib/investor-bank-accounts"

const TABS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "address", label: "Address", icon: MapPin },
  { id: "tax", label: "Tax Info", icon: FileText },
  { id: "bank", label: "Bank Details", icon: CreditCard },
  { id: "kyc", label: "KYC & Documents", icon: ShieldCheck },
]

const RISK_LEVELS = ["Conservative", "Moderate", "Balanced", "Growth", "Aggressive"]

type DocStep = { key: string; label: string; status: string; uploaded_at?: string | null }

function Field({
  label, value, onChange, editing, type = "text", readOnly = false,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  editing: boolean
  type?: string
  readOnly?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={!editing || readOnly}
        className={!editing || readOnly ? "bg-muted/40" : ""}
      />
    </div>
  )
}

export default function InvestProfile() {
  const { user, refreshUser, updateProfile } = useLocalAuth()
  const [tab, setTab] = useState("personal")
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocStep[]>([])
  const [kycStatus, setKycStatus] = useState("missing")
  const [riskProfile, setRiskProfile] = useState("Balanced")
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    nationality: "",
    cnic: "",
    company_name: "",
    company_type: "",
    registration_no: "",
    industry: "",
    founded: "",
    revenue: "",
    employees: "",
    website: "",
    address: "",
    address_line2: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    tax_ntn: "",
    tax_strn: "",
    tax_jurisdiction: "",
    tax_residency: "",
    tax_fatca: "",
  })
  const [bankAccounts, setBankAccounts] = useState<InvestorBankAccount[]>([])

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function load() {
    setLoading(true)
    try {
      const res: any = await api.get("/api/investor/profile")
      const d = res?.data ?? res
      const personal = d?.personal || {}
      const company = d?.company || {}
      const address = d?.address || {}
      const tax = d?.tax || {}
      setForm({
        name: personal.name || user?.fullName || "",
        email: personal.email || user?.email || "",
        phone: personal.phone || "",
        dob: personal.dob || "",
        nationality: personal.nationality || "",
        cnic: personal.cnic || "",
        company_name: company.company_name || "",
        company_type: company.company_type || "",
        registration_no: company.registration_no || "",
        industry: company.industry || "",
        founded: company.founded || "",
        revenue: company.revenue || "",
        employees: company.employees || "",
        website: company.website || "",
        address: address.address || "",
        address_line2: address.address_line2 || "",
        city: address.city || "",
        province: address.province || "",
        postal_code: address.postal_code || "",
        country: address.country || "",
        tax_ntn: tax.ntn || "",
        tax_strn: tax.strn || "",
        tax_jurisdiction: tax.jurisdiction || "",
        tax_residency: tax.residency || "",
        tax_fatca: tax.fatca || "",
      })
      const rawAccounts = Array.isArray(d?.bank_accounts) ? d.bank_accounts : []
      const fallbackCurrency = address.country?.toLowerCase?.() === "pakistan" ? "PKR" : "USD"
      const mapped = ensureDefaultBankAccount(
        rawAccounts.map((a: any) => normalizeBankAccount(a || {}, fallbackCurrency)).filter(hasUsableBankAccount)
      )
      setBankAccounts(mapped.length ? mapped : [])
      setDocs(d?.kyc?.steps || [])
      setKycStatus(d?.kyc?.status || "missing")
      setRiskProfile(d?.risk_profile || "Balanced")
    } catch (e: any) {
      notify.error(e?.message || "Unable to load profile")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.put("/api/investor/profile", {
        name: form.name,
        phone: form.phone,
        company_name: form.company_name,
        country: form.country,
        city: form.city,
        address: form.address,
        dob: form.dob,
        nationality: form.nationality,
        cnic: form.cnic,
        company_type: form.company_type,
        registration_no: form.registration_no,
        industry: form.industry,
        founded: form.founded,
        revenue: form.revenue,
        employees: form.employees,
        website: form.website,
        province: form.province,
        postal_code: form.postal_code,
        address_line2: form.address_line2,
        tax: {
          ntn: form.tax_ntn,
          strn: form.tax_strn,
          jurisdiction: form.tax_jurisdiction,
          residency: form.tax_residency,
          fatca: form.tax_fatca,
        },
        bank_accounts: ensureDefaultBankAccount(
          bankAccounts.filter(hasUsableBankAccount)
        ),
        risk_profile: riskProfile,
      })
      updateProfile({
        fullName: form.name,
        phone: form.phone,
        companyName: form.company_name,
        country: form.country,
      })
      await refreshUser()
      setSaved(true)
      setEditing(false)
      notify.success("Profile updated")
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      notify.error(e?.message || "Unable to save profile")
    } finally {
      setSaving(false)
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
      const res: any = await api.post("/api/investor/profile/kyc/upload", {
        doc_type: docType,
        path,
        original_name: file.name,
      })
      setDocs(res?.data?.kyc?.steps || [])
      setKycStatus(res?.data?.kyc?.status || "pending")
      window.dispatchEvent(new Event("og-kyc-updated"))
      notify.success("Document uploaded for admin review")
    } catch (e: any) {
      notify.error(e?.message || "Unable to upload document")
    } finally {
      setUploadingDoc(null)
    }
  }

  const initials = (form.name || "IN").split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase()
  const kycApproved = kycStatus === "approved"
  const kycBadge = kycApproved ? "KYC Verified"
    : kycStatus === "pending" || kycStatus === "review" ? "KYC Under Review"
    : "KYC Unverified"
  const kycBadgeCls = kycApproved
    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
    : kycStatus === "pending" || kycStatus === "review"
      ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
      : "bg-red-600/10 border-red-500/30 text-red-600"

  if (loading) {
    return (
      <InvestPortalLayout title="Investor Profile" subtitle="Manage your personal and corporate information">
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading profile…
        </div>
      </InvestPortalLayout>
    )
  }

  return (
    <InvestPortalLayout title="Investor Profile" subtitle="Manage your personal and corporate information">
      <div className="space-y-6">

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
                style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
                {initials}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-heading font-bold">{form.name || "Investor"}</h2>
                  <Badge className={`${kycBadgeCls} border text-xs flex items-center gap-1`}>
                    <ShieldCheck className="w-3 h-3" /> {kycBadge}
                  </Badge>
                  {form.company_name && <Badge variant="outline" className="text-xs">Corporate Investor</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{form.email}</p>
                <div className="flex gap-4 pt-1 text-xs text-muted-foreground">
                  <span>Risk Profile: <strong className="text-primary">{riskProfile}</strong></span>
                </div>
              </div>
              <Button
                size="sm"
                variant={editing ? "default" : "outline"}
                onClick={() => editing ? void handleSave() : setEditing(true)}
                className="shrink-0"
                disabled={saving}
              >
                {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
                  : editing ? <><Save className="w-4 h-4 mr-1.5" /> Save Changes</>
                  : <><Edit2 className="w-4 h-4 mr-1.5" /> Edit Profile</>}
              </Button>
            </div>
            {saved && (
              <div className="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-1 overflow-x-auto bg-muted/40 p-1 rounded-xl">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "personal" && (
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full Name" value={form.name} onChange={v => setField("name", v)} editing={editing} />
                <Field label="Email Address" value={form.email} editing={editing} readOnly />
                <Field label="Phone Number" value={form.phone} onChange={v => setField("phone", v)} editing={editing} />
                <Field label="Date of Birth" value={form.dob} onChange={v => setField("dob", v)} editing={editing} type="date" />
                <Field label="Nationality" value={form.nationality} onChange={v => setField("nationality", v)} editing={editing} />
                <Field label="CNIC / Passport No." value={form.cnic} onChange={v => setField("cnic", v)} editing={editing} />
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "company" && (
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Company Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Company Name" value={form.company_name} onChange={v => setField("company_name", v)} editing={editing} />
                <Field label="Company Type" value={form.company_type} onChange={v => setField("company_type", v)} editing={editing} />
                <Field label="Registration Number" value={form.registration_no} onChange={v => setField("registration_no", v)} editing={editing} />
                <Field label="Industry" value={form.industry} onChange={v => setField("industry", v)} editing={editing} />
                <Field label="Founded" value={form.founded} onChange={v => setField("founded", v)} editing={editing} />
                <Field label="Annual Revenue" value={form.revenue} onChange={v => setField("revenue", v)} editing={editing} />
                <Field label="Number of Employees" value={form.employees} onChange={v => setField("employees", v)} editing={editing} />
                <Field label="Website" value={form.website} onChange={v => setField("website", v)} editing={editing} />
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "address" && (
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Address Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Address Line 1" value={form.address} onChange={v => setField("address", v)} editing={editing} />
                <Field label="Address Line 2" value={form.address_line2} onChange={v => setField("address_line2", v)} editing={editing} />
                <Field label="City" value={form.city} onChange={v => setField("city", v)} editing={editing} />
                <Field label="Province / State" value={form.province} onChange={v => setField("province", v)} editing={editing} />
                <Field label="Postal Code" value={form.postal_code} onChange={v => setField("postal_code", v)} editing={editing} />
                <Field label="Country" value={form.country} onChange={v => setField("country", v)} editing={editing} />
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "tax" && (
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Tax Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Tax Identification Number (NTN)" value={form.tax_ntn} onChange={v => setField("tax_ntn", v)} editing={editing} />
                <Field label="STRN (Sales Tax)" value={form.tax_strn} onChange={v => setField("tax_strn", v)} editing={editing} />
                <Field label="Tax Jurisdiction" value={form.tax_jurisdiction} onChange={v => setField("tax_jurisdiction", v)} editing={editing} />
                <Field label="Tax Residency" value={form.tax_residency} onChange={v => setField("tax_residency", v)} editing={editing} />
                <Field label="FATCA / CRS Status" value={form.tax_fatca} onChange={v => setField("tax_fatca", v)} editing={editing} />
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "bank" && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" /> Bank Accounts
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add payout accounts for withdrawals. The default account is used for autofill on the withdraw page.
                  </p>
                </div>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currency = form.country?.toLowerCase() === "pakistan" ? "PKR" : "USD"
                      setBankAccounts(prev => {
                        const next = [...prev, createEmptyBankAccount(currency)]
                        return prev.length === 0 ? ensureDefaultBankAccount(next) : next
                      })
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add more
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {bankAccounts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">No bank accounts saved yet.</p>
                    {editing ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currency = form.country?.toLowerCase() === "pakistan" ? "PKR" : "USD"
                          setBankAccounts(ensureDefaultBankAccount([createEmptyBankAccount(currency)]))
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1.5" /> Add bank account
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click Edit Profile to add an account.</p>
                    )}
                  </div>
                )}

                {bankAccounts.map((account, index) => (
                  <div key={account.id} className="rounded-xl border border-border p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">Account {index + 1}</span>
                        {account.is_default && (
                          <Badge variant="secondary" className="text-[10px]">Default</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className={`flex items-center gap-2 text-sm ${editing ? "cursor-pointer" : "opacity-70"}`}>
                          <input
                            type="radio"
                            name="default_bank_account"
                            checked={account.is_default}
                            disabled={!editing}
                            onChange={() => {
                              setBankAccounts(prev =>
                                prev.map(a => ({ ...a, is_default: a.id === account.id }))
                              )
                            }}
                          />
                          Set as default
                        </label>
                        {editing && bankAccounts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setBankAccounts(prev =>
                                ensureDefaultBankAccount(prev.filter(a => a.id !== account.id))
                              )
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field
                        label="Bank Name"
                        value={account.bank_name}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, bank_name: v } : a)
                        )}
                      />
                      <Field
                        label="Account Holder"
                        value={account.account_holder}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, account_holder: v } : a)
                        )}
                      />
                      <Field
                        label="Account Number"
                        value={account.account_number}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, account_number: v } : a)
                        )}
                      />
                      <Field
                        label="IBAN"
                        value={account.iban}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, iban: v } : a)
                        )}
                      />
                      <Field
                        label="SWIFT / BIC"
                        value={account.swift}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, swift: v } : a)
                        )}
                      />
                      <Field
                        label="Branch"
                        value={account.branch}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, branch: v } : a)
                        )}
                      />
                      <Field
                        label="Account Currency"
                        value={account.currency}
                        editing={editing}
                        onChange={v => setBankAccounts(prev =>
                          prev.map(a => a.id === account.id ? { ...a, currency: v.toUpperCase() } : a)
                        )}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "kyc" && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> KYC Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${kycBadgeCls}`}>
                    {kycApproved
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm font-medium">{kycBadge}</span>
                  </div>
                  {kycStatus !== "approved" && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/40 border border-border">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">Upload documents for admin review</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {docs.map(doc => {
                    const uiStatus = doc.status === "missing" ? "not_uploaded" : doc.status === "verified" ? "verified" : doc.status
                    return (
                      <div key={doc.key} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{doc.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.uploaded_at ? `Uploaded: ${doc.uploaded_at}` : "Not uploaded"}
                          </div>
                        </div>
                        <Badge
                          className={`text-[10px] border-0 shrink-0 ${
                            uiStatus === "verified" ? "bg-emerald-500/15 text-emerald-600"
                            : uiStatus === "review" || uiStatus === "pending" ? "bg-amber-500/15 text-amber-600"
                            : "bg-red-500/15 text-red-600"
                          }`}
                        >
                          {uiStatus === "not_uploaded" ? "Unverified"
                            : uiStatus === "review" ? "Under Review"
                            : uiStatus === "verified" ? "Verified"
                            : uiStatus.charAt(0).toUpperCase() + uiStatus.slice(1)}
                        </Badge>
                        {(doc.status === "missing" || doc.status === "rejected") && (
                          <label className="shrink-0 cursor-pointer">
                            <span className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                              {uploadingDoc === doc.key
                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                                : <><Upload className="w-3 h-3" /> Upload</>}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="hidden"
                              disabled={!!uploadingDoc}
                              onChange={e => void handleDocUpload(doc.key, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Risk Profile</CardTitle>
                <p className="text-sm text-muted-foreground">Your current investment risk tolerance</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {RISK_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        if (!editing) setEditing(true)
                        setRiskProfile(level)
                      }}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${level === riskProfile ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Your current profile is set to <strong className="text-foreground">{riskProfile}</strong>.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </InvestPortalLayout>
  )
}
