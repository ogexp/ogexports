import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2, CheckCircle2, Clock, AlertCircle, Edit2,
  Phone, Mail, FileText, Shield, Upload, Save, Plus, Trash2, Loader2, X,
} from "lucide-react"
import { api, ApiError, resolveAttachmentUrl } from "@/lib/api"
import { notify } from "@/lib/notify"
import { useCountries, usePorts } from "@/hooks/useLocations"
import { findCountryByName } from "@/lib/country-names"

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  verified: { label: "Verified", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  review: { label: "Under Review", cls: "bg-amber-500/15 text-amber-600", icon: Clock },
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground", icon: AlertCircle },
}

const PAYMENT_TERMS_OPTIONS = ["LC at Sight", "100% Advance TT", "30% Advance + 70% BL", "SBLC"]
const INCOTERMS_OPTIONS = ["FOB", "CIF", "CFR", "DAP", "EXW"]
const SHIPPING_OPTIONS = ["Sea Freight (FCL)", "Sea Freight (LCL)", "Air Freight", "Road/Land"]
const COMMODITIES = ["Basmati Rice", "Sesame Seeds", "Yellow Corn", "Wheat", "Potato", "Onion", "Mango", "Kinnow", "Chickpeas", "Sugar"]

function portLabel(port: { name: string; unlocode: string }): string {
  return `${port.name} (${port.unlocode})`
}

function formatApiError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.errors) {
      const first = Object.values(e.errors).flat().find(Boolean)
      if (first) return String(first)
    }
    return e.message || fallback
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message?: string }).message || fallback)
  }
  return fallback
}

type Contact = {
  id: number
  name: string
  title?: string | null
  email?: string | null
  phone?: string | null
  is_primary?: boolean
}

type KycStep = {
  doc_type: string
  label: string
  status: string
  desc: string
  document?: { id: number; path: string; url?: string; original_name?: string } | null
}

type CompanyForm = {
  company_name: string
  registration_no: string
  import_license: string
  tax_id: string
  business_type: string
  annual_volume: string
  website: string
  country: string
  city: string
  address: string
}

type Prefs = {
  payment_terms: string
  incoterm: string
  shipping: string
  ports: string[]
  commodities: string[]
}

const EMPTY_COMPANY: CompanyForm = {
  company_name: "", registration_no: "", import_license: "", tax_id: "",
  business_type: "", annual_volume: "", website: "", country: "", city: "", address: "",
}

const EMPTY_PREFS: Prefs = {
  payment_terms: "LC at Sight", incoterm: "FOB", shipping: "Sea Freight (FCL)", ports: [], commodities: [],
}

export default function BuyerCompanyProfile() {
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "kyc" | "contacts" | "preferences">("profile")
  const [savedMsg, setSavedMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY)
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [kycSteps, setKycSteps] = useState<KycStep[]>([])
  const [verificationPct, setVerificationPct] = useState(0)

  const [contactModal, setContactModal] = useState<"add" | "edit" | null>(null)
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "", is_primary: false })
  const [editingContactId, setEditingContactId] = useState<number | null>(null)
  const [contactError, setContactError] = useState("")
  const [contactsLoading, setContactsLoading] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingDocType = useRef<string | null>(null)

  const { data: countries = [] } = useCountries()
  const matchedCountry = useMemo(
    () => findCountryByName(countries, company.country),
    [countries, company.country],
  )
  const countryId = matchedCountry?.id ?? null
  const { data: countryPorts = [], isLoading: portsLoading, isError: portsError } = usePorts(countryId)
  const portOptions = useMemo(
    () => countryPorts.map(p => ({ id: p.id, label: portLabel(p), name: p.name, unlocode: p.unlocode })),
    [countryPorts],
  )

  const flash = (msg: string) => {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(""), 3000)
  }

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    setContactError("")
    try {
      const res = await api.get<{ data: Contact[] }>("/api/buyer/company/contacts")
      setContacts(Array.isArray(res?.data) ? res.data : [])
    } catch (e: unknown) {
      const msg = formatApiError(e, "Failed to load contact persons")
      setContactError(msg)
      setContacts([])
    } finally {
      setContactsLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await api.get<{ data: any }>("/api/buyer/company")
      const d = res?.data
      const c = d?.company || {}
      setCompany({
        company_name: c.company_name || "",
        registration_no: c.registration_no || "",
        import_license: typeof c.import_license === "string" ? c.import_license : "",
        tax_id: c.tax_id || "",
        business_type: c.business_type || "",
        annual_volume: c.annual_volume || "",
        website: c.website || "",
        country: c.country || "",
        city: c.city || "",
        address: c.address || "",
      })
      const tp = d?.trade_preferences || {}
      setPrefs({
        payment_terms: tp.payment_terms || "LC at Sight",
        incoterm: tp.incoterm || "FOB",
        shipping: tp.shipping || "Sea Freight (FCL)",
        ports: Array.isArray(tp.ports) ? tp.ports : [],
        commodities: Array.isArray(tp.commodities) ? tp.commodities : [],
      })
      setContacts(Array.isArray(d?.contacts) ? d.contacts : [])
      setKycSteps(Array.isArray(d?.kyc?.steps) ? d.kyc.steps : [])
      setVerificationPct(Number(d?.verification_pct ?? 0))
      setContactError("")
    } catch (e: unknown) {
      const msg = formatApiError(e, "Failed to load company profile")
      setErrorMsg(msg)
      notify.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Drop preferred ports that no longer belong to the buyer's country once ports load
  useEffect(() => {
    if (!countryId || portsLoading || portOptions.length === 0) return
    const allowed = new Set(portOptions.flatMap(p => [
      p.label.toLowerCase(),
      p.name.toLowerCase(),
      p.unlocode.toLowerCase(),
    ]))
    setPrefs(prev => {
      const next = prev.ports.filter(label => allowed.has(label.trim().toLowerCase()))
      if (next.length === prev.ports.length) return prev
      return { ...prev, ports: next }
    })
  }, [countryId, portsLoading, portOptions])

  async function saveCompany() {
    setSaving(true)
    setErrorMsg("")
    try {
      await api.put("/api/buyer/company", company)
      setEditing(false)
      flash("Company profile saved.")
      await load()
    } catch (e: unknown) {
      setErrorMsg(formatApiError(e, "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  async function savePrefs() {
    setSaving(true)
    setErrorMsg("")
    try {
      await api.put("/api/buyer/company/preferences", prefs)
      flash("Trade preferences saved.")
    } catch (e: unknown) {
      setErrorMsg(formatApiError(e, "Save failed"))
    } finally {
      setSaving(false)
    }
  }

  function openAddContact() {
    setContactForm({ name: "", title: "", email: "", phone: "", is_primary: false })
    setEditingContactId(null)
    setContactError("")
    setContactModal("add")
  }

  function openEditContact(c: Contact) {
    setContactForm({
      name: c.name || "",
      title: c.title || "",
      email: c.email || "",
      phone: c.phone || "",
      is_primary: !!c.is_primary,
    })
    setEditingContactId(c.id)
    setContactError("")
    setContactModal("edit")
  }

  async function saveContact() {
    if (!contactForm.name.trim()) {
      setContactError("Contact name is required")
      return
    }
    setSaving(true)
    setContactError("")
    setErrorMsg("")
    try {
      if (contactModal === "edit" && editingContactId) {
        await api.put(`/api/buyer/company/contacts/${editingContactId}`, contactForm)
        flash("Contact updated.")
      } else {
        await api.post("/api/buyer/company/contacts", contactForm)
        flash("Contact added.")
      }
      setContactModal(null)
      await loadContacts()
    } catch (e: unknown) {
      setContactError(formatApiError(e, "Could not save contact"))
    } finally {
      setSaving(false)
    }
  }

  async function deleteContact(id: number) {
    if (!confirm("Delete this contact person?")) return
    setContactError("")
    try {
      await api.delete(`/api/buyer/company/contacts/${id}`)
      flash("Contact deleted.")
      await loadContacts()
    } catch (e: unknown) {
      setContactError(formatApiError(e, "Delete failed"))
    }
  }

  function startUpload(docType: string) {
    pendingDocType.current = docType
    fileRef.current?.click()
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const docType = pendingDocType.current
    e.target.value = ""
    if (!file || !docType) return

    setUploadingType(docType)
    setErrorMsg("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "kyc")
      const up = await api.upload<{ data: { path: string; name?: string } }>("/api/uploads", fd)
      const path = up?.data?.path
      if (!path) throw new Error("Upload failed")
      await api.post("/api/buyer/company/kyc/upload", {
        doc_type: docType,
        path,
        original_name: up?.data?.name || file.name,
      })
      flash("Document uploaded — pending review.")
      window.dispatchEvent(new Event("og-kyc-updated"))
      await load()
    } catch (err: any) {
      setErrorMsg(err?.message || "Upload failed")
    } finally {
      setUploadingType(null)
      pendingDocType.current = null
    }
  }

  function viewDoc(step: KycStep) {
    const url = resolveAttachmentUrl(step.document?.path, step.document?.url)
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }

  const verifiedCount = kycSteps.filter(s => s.status === "verified").length
  const pct = verificationPct || Math.round((verifiedCount / Math.max(kycSteps.length, 1)) * 100)

  const companyFields: { label: string; key: keyof CompanyForm }[] = [
    { label: "Company Name", key: "company_name" },
    { label: "Company Registration No.", key: "registration_no" },
    { label: "Import License Number", key: "import_license" },
    { label: "Tax Registration (VAT/TIN)", key: "tax_id" },
    { label: "Business Type", key: "business_type" },
    { label: "Annual Import Volume", key: "annual_volume" },
    { label: "Website", key: "website" },
    { label: "Country", key: "country" },
  ]

  if (loading) {
    return (
      <BuyerPortalLayout title="Company Profile" subtitle="Business information, verification and trade preferences">
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      </BuyerPortalLayout>
    )
  }

  return (
    <BuyerPortalLayout title="Company Profile" subtitle="Business information, verification and trade preferences">
      <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={onFileSelected} />

      <div className="space-y-7">
        <Card className="glass-card border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Shield className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-heading font-bold text-base">Business Verification</h3>
                    <Badge className={`border-0 text-xs ${pct >= 100 ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                      {pct >= 100 ? "Verified" : "Partial"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {verifiedCount} of {Math.max(kycSteps.length, 1)} verification steps complete
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-heading font-bold">{pct}%</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { key: "profile", label: "Company Details" },
            { key: "kyc", label: "KYC & Verification" },
            { key: "contacts", label: "Contact Persons" },
            { key: "preferences", label: "Trade Preferences" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >{tab.label}</button>
          ))}
        </div>

        {savedMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {savedMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
          </div>
        )}

        {activeTab === "profile" && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" /> Company Information
              </CardTitle>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(false); load() }}>Cancel</Button>
                    <Button size="sm" onClick={saveCompany} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-5">
                {companyFields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">{field.label}</Label>
                    {editing ? (
                      <Input
                        value={company[field.key]}
                        onChange={e => setCompany(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="h-9 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-semibold py-2 px-3 rounded-lg bg-muted/30">{company[field.key] || "—"}</p>
                    )}
                  </div>
                ))}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Business Address</Label>
                  {editing ? (
                    <textarea
                      value={company.address}
                      onChange={e => setCompany(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent resize-none"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm font-semibold py-2 px-3 rounded-lg bg-muted/30">{company.address || "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "kyc" && (
          <div className="space-y-4">
            {kycSteps.map(step => {
              const meta = STATUS_META[step.status] || STATUS_META.pending
              return (
                <Card key={step.doc_type} className={`glass-card transition-all ${step.status === "review" ? "border-amber-500/20" : step.status === "verified" ? "border-emerald-500/15" : ""}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      step.status === "verified" ? "bg-emerald-500/15" : step.status === "review" ? "bg-amber-500/15" : "bg-muted"
                    }`}>
                      <meta.icon className={`w-5 h-5 ${step.status === "verified" ? "text-emerald-500" : step.status === "review" ? "text-amber-500" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{step.label}</p>
                        <Badge className={`text-[10px] border-0 ${meta.cls}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {step.document && (
                        <Button size="sm" variant="outline" onClick={() => viewDoc(step)}>
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> View
                        </Button>
                      )}
                      {(step.status === "pending" || step.status === "review") && (
                        <Button size="sm" variant="outline" disabled={uploadingType === step.doc_type} onClick={() => startUpload(step.doc_type)}>
                          {uploadingType === step.doc_type
                            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                          {step.document ? "Replace" : "Upload"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {kycSteps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No KYC steps available.</p>
            )}
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-4">
            {contactError && (
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <div className="flex items-center gap-3 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{contactError}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => void loadContacts()} disabled={contactsLoading}>
                  {contactsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Retry"}
                </Button>
              </div>
            )}
            {contactsLoading && contacts.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading contacts…
              </div>
            ) : (
              <>
                {contacts.map(c => (
                  <Card key={c.id} className="glass-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, #0F3D2E, #4CAF50)" }}>
                            {(c.name || "?")[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">{c.name}</p>
                              {c.is_primary && <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Primary</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{c.title || "—"}</p>
                            <div className="flex flex-col gap-1 mt-2">
                              {c.email && <p className="text-xs flex items-center gap-1.5"><Mail className="w-3 h-3 text-muted-foreground" />{c.email}</p>}
                              {c.phone && <p className="text-xs flex items-center gap-1.5"><Phone className="w-3 h-3 text-muted-foreground" />{c.phone}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditContact(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => deleteContact(c.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {contacts.length === 0 && !contactError && (
                  <p className="text-sm text-muted-foreground text-center py-6">No contact persons yet.</p>
                )}
              </>
            )}
            <Button variant="outline" className="w-full" onClick={openAddContact}>
              <Plus className="w-4 h-4 mr-2" /> Add Contact Person
            </Button>
          </div>
        )}

        {activeTab === "preferences" && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-heading text-base">Trade Preferences</CardTitle>
              <Button size="sm" onClick={savePrefs} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Save
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Payment Terms</Label>
                  <select value={prefs.payment_terms} onChange={e => setPrefs(p => ({ ...p, payment_terms: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent">
                    {PAYMENT_TERMS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Incoterms</Label>
                  <select value={prefs.incoterm} onChange={e => setPrefs(p => ({ ...p, incoterm: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent">
                    {INCOTERMS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Shipping</Label>
                  <select value={prefs.shipping} onChange={e => setPrefs(p => ({ ...p, shipping: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent">
                    {SHIPPING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Ports</Label>
                  {!company.country.trim() ? (
                    <p className="text-xs text-muted-foreground">Set your company country first to see available ports.</p>
                  ) : !matchedCountry ? (
                    <p className="text-xs text-amber-600">
                      No matching country found for “{company.country}”. Update the country on Company Details.
                    </p>
                  ) : portsLoading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading ports for {matchedCountry.name}…
                    </p>
                  ) : portsError ? (
                    <p className="text-xs text-destructive">Could not load ports. Please retry later.</p>
                  ) : portOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No ports available for {matchedCountry.name}.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {portOptions.map(p => {
                        const checked = prefs.ports.some(
                          label => label.trim().toLowerCase() === p.label.toLowerCase()
                            || label.trim().toLowerCase() === p.name.toLowerCase()
                            || label.trim().toLowerCase() === p.unlocode.toLowerCase(),
                        )
                        return (
                          <label key={p.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => setPrefs(prev => {
                                const without = prev.ports.filter(x => {
                                  const n = x.trim().toLowerCase()
                                  return n !== p.label.toLowerCase()
                                    && n !== p.name.toLowerCase()
                                    && n !== p.unlocode.toLowerCase()
                                })
                                return {
                                  ...prev,
                                  ports: e.target.checked ? [...without, p.label] : without,
                                }
                              })}
                              className="accent-accent"
                            />
                            {p.label}
                          </label>
                        )
                      })}
                    </div>
                  )}
                  {company.country.trim() && matchedCountry && (
                    <p className="text-[11px] text-muted-foreground">Showing ports for {matchedCountry.name} only.</p>
                  )}
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Primary Commodities of Interest</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMODITIES.map(c => (
                      <label key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border cursor-pointer hover:border-accent/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={prefs.commodities.includes(c)}
                          onChange={e => setPrefs(prev => ({
                            ...prev,
                            commodities: e.target.checked ? [...prev.commodities, c] : prev.commodities.filter(x => x !== c),
                          }))}
                          className="accent-accent"
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{contactModal === "add" ? "Add Contact Person" : "Edit Contact Person"}</CardTitle>
              <button type="button" onClick={() => setContactModal(null)}><X className="w-4 h-4" /></button>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{contactError}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} className="accent-accent" />
                Primary contact
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setContactModal(null)}>Cancel</Button>
                <Button onClick={saveContact} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </BuyerPortalLayout>
  )
}
