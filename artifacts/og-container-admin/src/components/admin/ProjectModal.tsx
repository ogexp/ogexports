import { useEffect, useMemo, useRef, useState } from "react"
import { X, Save, Upload, ImagePlus, Loader2, FileText, Plus, Eye, Download } from "lucide-react"
import {
  uploadProjectDocument, deleteProjectDocument, INVESTMENT_DOCUMENT_TITLES,
  type AdminInvestProject, type AdminInvestProjectDocument,
} from "@/lib/admin-data"
import { useCountries, usePorts } from "@/hooks/useLocations"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import { isoToFlagEmoji } from "@/lib/country-flag"
import { findCountryByName, normalizeCountryValue } from "@/lib/country-names"
import {
  ApiError, downloadPublicFile, openPublicFile, resolveDocumentUrl, resolveMediaUrl,
  toStoredMediaPath, uploadInvestmentImage,
} from "@/lib/api"
import {
  CONTAINER_PROJECT_STATUSES,
  CONTAINER_PROJECT_STATUS_LABELS,
} from "@/lib/container-project-statuses"

const GOLD = "#D4A012"
const EMERALD = "#0F3D2E"

function toIsoDate(v?: string | null): string {
  if (!v) return ""
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

// ── Project Form Modal ────────────────────────────────────────────────────────
const FACILITY_STATUS_OPTIONS = ["funding", "active", "completed"] as const
const FACILITY_STATUS_LABELS: Record<(typeof FACILITY_STATUS_OPTIONS)[number], string> = {
  funding: "Funding",
  active: "Active",
  completed: "Completed",
}

const isFacilityProjectType = (type?: AdminInvestProject["type"]) =>
  type === "plant" || type === "ricemill" || type === "feed"

const emptyForm = (): Omit<AdminInvestProject, "id"> => ({
  title: "", type: "container", tradeDirection: "export", target: 100000, raised: 0, investors: 0,
  status: "funding", roi: "18%", vessel: "", etd: "", eta: "", location: "", completion: "",
  // Rich investor-facing fields
  imageUrl: "", description: "", commodity: "", variety: "",
  containerType: "40ft", containerNumber: "", containerValue: 0, minInvestment: 100, maxInvestment: null,
  destination: "", destinationFlag: "", destinationCountry: "",
  portOfLoading: "Port Qasim", portOfDischarge: "", origin: "Pakistan",
  incoterm: "FOB", paymentTermsInvest: "LC at sight", riskLevel: "low" as const,
  fundingDeadlineDate: "", investmentPeriodDays: 45, expectedReturnPct: 8,
  targetDistributionDate: "",
  currentProjectStage: "Funding", productCategory: "", shippingLine: "",
  timeline: "", sortOrder: 0,
})

function normalizeFormDates(data: Partial<AdminInvestProject>): Omit<AdminInvestProject, "id"> {
  const base = { ...emptyForm(), ...data }
  return {
    ...base,
    etd: toIsoDate(base.etd),
    eta: toIsoDate(base.eta),
    fundingDeadlineDate: toIsoDate(base.fundingDeadlineDate),
    targetDistributionDate: toIsoDate(base.targetDistributionDate),
  }
}

function ProjectModal({
  initial, onSave, onClose
}: {
  initial: Partial<AdminInvestProject> | null
  onSave: (data: Omit<AdminInvestProject, "id">, id?: string) => Promise<AdminInvestProject>
  onClose: () => void
}) {
  const isEdit = !!(initial && initial.id)
  const [form, setForm] = useState<Omit<AdminInvestProject, "id">>(() => {
    if (initial) {
      const { id: _id, ...rest } = initial as AdminInvestProject
      return normalizeFormDates({
        ...rest,
        ...(isFacilityProjectType(rest.type) && !rest.status ? { status: "funding" } : {}),
      })
    }
    return emptyForm()
  })
  const [countryId, setCountryId] = useState("")
  const [portId, setPortId] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState("")
  const [existingImagePath, setExistingImagePath] = useState(() => {
    const init = initial as AdminInvestProject | null
    return init?.imagePath ?? toStoredMediaPath(init?.imageUrl) ?? ""
  })
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const coverInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<AdminInvestProjectDocument[]>(
    () => (initial as AdminInvestProject | null)?.documents || [],
  )
  const [pendingDocs, setPendingDocs] = useState<{ title: string; file: File }[]>([])
  const [docTitleChoice, setDocTitleChoice] = useState<string>(INVESTMENT_DOCUMENT_TITLES[0])
  const [docCustomTitle, setDocCustomTitle] = useState("")
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docBusy, setDocBusy] = useState(false)
  const [docError, setDocError] = useState("")
  const isFacility = isFacilityProjectType(form.type)

  const resolvedDocTitle = docTitleChoice === "Other"
    ? docCustomTitle.trim()
    : docTitleChoice

  const { data: countries = [], isLoading: countriesLoading, isError: countriesError } = useCountries({ enabled: !isFacility })
  const destinationCountries = useMemo(
    () => countries.filter(c => (c.ports_count ?? 0) > 0),
    [countries],
  )
  const { data: ports = [], isLoading: portsLoading, isError: portsError } = usePorts(countryId)

  // Match saved country strings when editing / after countries load
  useEffect(() => {
    if (isFacility) return
    if (!destinationCountries.length || countryId) return
    const matched = findCountryByName(destinationCountries, form.destinationCountry || form.destination)
    if (matched) {
      setCountryId(String(matched.id))
      if (!form.destinationFlag) {
        setForm(f => ({ ...f, destinationFlag: isoToFlagEmoji(matched.code) }))
      }
    }
  }, [destinationCountries, countryId, form.destinationCountry, form.destination, form.destinationFlag, isFacility])

  // Match saved port name when ports load
  useEffect(() => {
    if (isFacility) return
    if (!ports.length || !form.portOfDischarge || portId) return
    const needle = normalizeCountryValue(form.portOfDischarge)
    const matched = ports.find(p => {
      const name = normalizeCountryValue(p.name)
      return name === needle || name.includes(needle) || needle.includes(name)
    })
    if (matched) setPortId(String(matched.id))
  }, [ports, form.portOfDischarge, portId, isFacility])

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: keyof Omit<AdminInvestProject, "id">, v: any) => setForm(f => ({ ...f, [k]: v }))

  function handleCountryChange(value: string) {
    setCountryId(value)
    setPortId("")
    const country = destinationCountries.find(c => String(c.id) === value)
    if (!country) {
      setForm(f => ({
        ...f,
        destination: "",
        destinationCountry: "",
        destinationFlag: "",
        portOfDischarge: "",
      }))
      return
    }
    setForm(f => ({
      ...f,
      destination: country.label,
      destinationCountry: country.label,
      destinationFlag: isoToFlagEmoji(country.code),
      portOfDischarge: "",
    }))
  }

  function handlePortChange(value: string) {
    setPortId(value)
    const port = ports.find(p => String(p.id) === value)
    set("portOfDischarge", port?.name || "")
  }

  function pickCover(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setUploadError("")
  }

  function clearCover() {
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
    setCoverFile(null)
    setCoverPreview("")
    setExistingImagePath("")
    set("imageUrl", "")
    if (coverInputRef.current) coverInputRef.current.value = ""
  }

  const coverDisplay = coverPreview || (existingImagePath ? resolveMediaUrl(existingImagePath) : (form.imageUrl ? resolveMediaUrl(form.imageUrl) : ""))

  async function handleAddDocument() {
    if (!resolvedDocTitle || !docFile) {
      setDocError("Select a document title and file.")
      return
    }
    setDocError("")
    if (isEdit && initial?.id) {
      setDocBusy(true)
      try {
        const doc = await uploadProjectDocument(String(initial.id), docFile, resolvedDocTitle)
        setDocuments(prev => [...prev, doc])
        setDocFile(null)
        setDocCustomTitle("")
        setDocTitleChoice(INVESTMENT_DOCUMENT_TITLES[0])
        if (docInputRef.current) docInputRef.current.value = ""
      } catch (err) {
        const msg = err instanceof ApiError
          ? (err.errors ? Object.values(err.errors).flat()[0] : err.message)
          : (err as Error)?.message || "Failed to upload document."
        setDocError(String(msg))
      } finally {
        setDocBusy(false)
      }
      return
    }
    setPendingDocs(prev => [...prev, { title: resolvedDocTitle, file: docFile }])
    setDocFile(null)
    setDocCustomTitle("")
    setDocTitleChoice(INVESTMENT_DOCUMENT_TITLES[0])
    if (docInputRef.current) docInputRef.current.value = ""
  }

  async function handleRemoveDocument(doc: AdminInvestProjectDocument) {
    if (!isEdit || !initial?.id) return
    setDocBusy(true)
    try {
      await deleteProjectDocument(String(initial.id), doc.id)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message || "Failed to delete."
      setDocError(String(msg))
    } finally {
      setDocBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || saving) return
    setSaving(true)
    setUploadError("")
    try {
      let imagePath = existingImagePath
      if (coverFile) {
        const uploaded = await uploadInvestmentImage(
          coverFile,
          form.title.trim(),
          isEdit ? (initial as AdminInvestProject).id : undefined,
        )
        imagePath = toStoredMediaPath(uploaded.path) || uploaded.path
      }
      const saved = await onSave(
        {
          ...form,
          imagePath,
          imageUrl: imagePath ? resolveMediaUrl(imagePath) : undefined,
          documents,
        },
        isEdit ? (initial as AdminInvestProject).id : undefined,
      )
      if (!isEdit && pendingDocs.length > 0 && saved?.id) {
        for (const pending of pendingDocs) {
          await uploadProjectDocument(saved.id, pending.file, pending.title)
        }
      }
      onClose()
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.errors ? Object.values(err.errors).flat()[0] : err.message)
        : (err as Error)?.message || "Failed to save project."
      setUploadError(String(msg))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={saving ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-lg">{isEdit ? "Edit Project" : "Add New Investment Project"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Fill all fields to publish on the investment portal</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-2">Project Type *</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: "container", label: "Container", icon: "🚢" },
                { id: "produce", label: "Fresh Produce", icon: "🌿" },
                { id: "plant", label: "Plant / Factory", icon: "🏭" },
                { id: "ricemill", label: "Rice Mill", icon: "🌾" },
                { id: "feed", label: "Feed Mill", icon: "🐄" },
              ].map(t => (
                <button key={t.id} type="button"
                  onClick={() => set("type", t.id as AdminInvestProject["type"])}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: form.type === t.id ? EMERALD : "#e2e8f0",
                    background: form.type === t.id ? "#f0fdf4" : "transparent",
                    color: form.type === t.id ? EMERALD : "#64748b",
                  }}>
                  <span className="text-2xl">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Core fields + cover image */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Project Title *</label>
                <input required value={form.title} onChange={e => set("title", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="e.g. Basmati Rice Export — Dubai" />
              </div>
              {isEdit && (initial as AdminInvestProject)?.reference && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Reference No.</label>
                  <input readOnly value={(initial as AdminInvestProject).reference || ""}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted/30 font-mono text-muted-foreground" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Status</label>
                  <select value={form.status} onChange={e => set("status", e.target.value as AdminInvestProject["status"])}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background">
                    {(form.type === "container" ? CONTAINER_PROJECT_STATUSES : FACILITY_STATUS_OPTIONS).map(s => (
                      <option key={s} value={s}>
                        {form.type === "container"
                          ? CONTAINER_PROJECT_STATUS_LABELS[s as keyof typeof CONTAINER_PROJECT_STATUS_LABELS]
                          : FACILITY_STATUS_LABELS[s as keyof typeof FACILITY_STATUS_LABELS]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">ROI (e.g. 18.4%)</label>
                  <input value={form.roi} onChange={e => set("roi", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. 18.4%" />
                </div>
              </div>
              {isEdit && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Raised ($)</label>
                    <input type="number" min={0} value={form.raised}
                      onChange={e => set("raised", Number(e.target.value))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-muted/30"
                      placeholder="0" />
                    <p className="text-[10px] text-muted-foreground mt-1">Recalculated from approved deposits</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Investors</label>
                    <input type="number" min={0} value={form.investors}
                      onChange={e => set("investors", Number(e.target.value))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-muted/30"
                      placeholder="0" />
                    <p className="text-[10px] text-muted-foreground mt-1">Recalculated from approved deposits</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Cover Image</label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={e => {
                    pickCover(e.target.files)
                    if (coverInputRef.current) coverInputRef.current.value = ""
                  }}
                />
                <div className="space-y-2">
                  {coverDisplay ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border bg-white">
                      <img src={coverDisplay} alt="Cover preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={clearCover}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full aspect-video rounded-lg border border-dashed border-primary/40 bg-white flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground hover:bg-primary/5"
                    >
                      <ImagePlus className="w-6 h-6 text-primary/70" />
                      Browse to upload
                    </button>
                  )}
                  {coverDisplay && (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-xs font-semibold hover:bg-muted"
                    >
                      <Upload className="w-3.5 h-3.5" /> Replace
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">JPG, PNG, WEBP or GIF · max 5MB</p>
                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Target ($)</label>
                <input type="number" min={1000} value={form.target}
                  onChange={e => set("target", Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="500000" />
              </div>
            </div>
          </div>

          {/* ── Rich Investment Details ──────────────────────────── */}
          <div className="p-5 rounded-xl border border-border/50 bg-slate-50 space-y-5">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <div className="w-1 h-4 rounded-full shrink-0" style={{ background: GOLD }} /> Trade & Investment Details
            </div>

            {/* Documents upload */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase block">Documents</label>
              <p className="text-[11px] text-muted-foreground">
                Upload Proforma Invoice, Bill of Lading Draft, Investment Agreement, or other files for investors.
              </p>

              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground">{doc.size || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const url = resolveDocumentUrl(doc)
                          if (url) openPublicFile(url)
                        }}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = resolveDocumentUrl(doc)
                          if (url) downloadPublicFile(url, doc.originalName || doc.title)
                        }}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        disabled={docBusy}
                        onClick={() => void handleRemoveDocument(doc)}
                        className="text-xs text-red-500 hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {pendingDocs.map((doc, idx) => (
                  <div key={`pending-${idx}`} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-[11px] text-muted-foreground">{doc.file.name} · pending save</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingDocs(prev => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-red-500 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {documents.length === 0 && pendingDocs.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No documents uploaded yet.</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={docTitleChoice}
                  onChange={e => setDocTitleChoice(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                >
                  {INVESTMENT_DOCUMENT_TITLES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {docTitleChoice === "Other" && (
                  <input
                    value={docCustomTitle}
                    onChange={e => setDocCustomTitle(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="Custom document title"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={e => {
                    setDocFile(e.target.files?.[0] || null)
                    setDocError("")
                  }}
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-xs font-semibold hover:bg-muted"
                >
                  <Upload className="w-3.5 h-3.5" /> {docFile ? docFile.name : "Choose file"}
                </button>
                <button
                  type="button"
                  disabled={docBusy || !docFile || !resolvedDocTitle}
                  onClick={() => void handleAddDocument()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  {docBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Document
                </button>
              </div>
              {docError && <p className="text-xs text-red-500">{docError}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Project Description</label>
              <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white resize-none"
                placeholder="Brief description shown to investors on the investment portal" />
            </div>

            {/* Commodity */}
            {!isFacility && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Commodity</label>
                <input value={form.commodity || ""} onChange={e => set("commodity", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. Basmati Rice" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Variety</label>
                <input value={form.variety || ""} onChange={e => set("variety", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. Super Basmati 1121" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Category</label>
                <input value={form.productCategory || ""} onChange={e => set("productCategory", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. Rice" />
              </div>
            </div>
            )}

            {/* Trade Route */}
            {!isFacility && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Destination Country</label>
                <SearchableSelect
                  showSearch
                  value={countryId}
                  onChange={handleCountryChange}
                  placeholder={countriesLoading ? "Loading countries..." : "Select country"}
                  searchPlaceholder="Search country…"
                  emptyText="No country found."
                  emptyLimit={destinationCountries.length}
                  options={destinationCountries.map(country => ({
                    value: String(country.id),
                    label: country.label,
                    keywords: country.searchTerms,
                  }))}
                />
                {countriesError && <p className="text-xs text-red-500 mt-1">Unable to load countries. Please refresh.</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Flag</label>
                <div className="w-full h-10 px-3 rounded-lg border border-border bg-muted/40 flex items-center text-2xl leading-none">
                  {form.destinationFlag || <span className="text-xs text-muted-foreground">Select a country</span>}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Port of Loading</label>
                <input value={form.portOfLoading || ""} onChange={e => set("portOfLoading", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="Port Qasim" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Port of Discharge</label>
                <SearchableSelect
                  showSearch
                  disabled={!countryId || portsLoading}
                  value={portId}
                  onChange={handlePortChange}
                  placeholder={
                    !countryId
                      ? "Select country first"
                      : portsLoading
                        ? "Loading ports..."
                        : ports.length
                          ? "Select port"
                          : "No maritime ports found"
                  }
                  searchPlaceholder="Search port…"
                  emptyText="No port found."
                  options={ports.map(port => ({
                    value: String(port.id),
                    label: `${port.name} (${port.unlocode})`,
                    keywords: port.unlocode,
                  }))}
                />
                {portsError && <p className="text-xs text-red-500 mt-1">Unable to load ports. Try another country.</p>}
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Target Distribution Date (Estimated)</label>
                <DatePicker
                  value={form.targetDistributionDate || ""}
                  onChange={v => set("targetDistributionDate", v)}
                  placeholder="Select estimated distribution date"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">Shown to investors as an estimate; it is not a guaranteed payout date.</p>
              </div>
            </div>

            {/* Investment Terms */}
            {!isFacility ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Return % (numeric)</label>
                <input type="number" value={form.expectedReturnPct || ""} onChange={e => set("expectedReturnPct", Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="8.5" step="0.1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Period (days)</label>
                <input type="number" value={form.investmentPeriodDays || ""} onChange={e => set("investmentPeriodDays", Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="45" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Min Investment ($)</label>
                <input type="number" value={form.minInvestment || ""} onChange={e => set("minInvestment", Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Max Investment ($)</label>
                <input type="number" min={0} value={form.maxInvestment ?? ""} onChange={e => set("maxInvestment", e.target.value === "" ? null : Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="Optional cap" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Risk Level</label>
                <select value={form.riskLevel || "low"} onChange={e => set("riskLevel", e.target.value as "low" | "medium" | "high")}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Funding Deadline</label>
                <DatePicker
                  value={form.fundingDeadlineDate || ""}
                  onChange={v => set("fundingDeadlineDate", v)}
                  placeholder="Select funding deadline"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Current Stage</label>
                <input value={form.currentProjectStage || ""} onChange={e => set("currentProjectStage", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. Funding" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Incoterm</label>
                <select value={form.incoterm || "FOB"} onChange={e => set("incoterm", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  {["FOB", "CIF", "CNF", "EXW", "CFR", "Air Shipment"].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Payment Terms</label>
                <input value={form.paymentTermsInvest || ""} onChange={e => set("paymentTermsInvest", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="LC at sight" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Shipping Line</label>
                <input value={form.shippingLine || ""} onChange={e => set("shippingLine", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. Maersk" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Container Number</label>
                <input value={form.containerNumber || ""} onChange={e => set("containerNumber", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. Container-123" />
              </div>
            </div>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Min Investment ($)</label>
                <input type="number" value={form.minInvestment || ""} onChange={e => set("minInvestment", Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="100" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Max Investment ($)</label>
                <input type="number" min={0} value={form.maxInvestment ?? ""} onChange={e => set("maxInvestment", e.target.value === "" ? null : Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="25000" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Risk Level</label>
                <select value={form.riskLevel || "low"} onChange={e => set("riskLevel", e.target.value as "low" | "medium" | "high")}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Funding Deadline</label>
                <DatePicker
                  value={form.fundingDeadlineDate || ""}
                  onChange={v => set("fundingDeadlineDate", v)}
                  placeholder="Select funding deadline"
                />
              </div>
            </div>
            )}
          </div>

          {/* Container-specific */}
          {form.type === "container" && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-xl" style={{ background: "#f0fdf4" }}>
              <div className="col-span-2 lg:col-span-3 text-xs font-semibold text-muted-foreground uppercase">Container / Shipping Details</div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Trade Direction</label>
                <select
                  value={form.tradeDirection || "export"}
                  onChange={e => set("tradeDirection", e.target.value as "export" | "import")}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                >
                  <option value="export">Export</option>
                  <option value="import">Import</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Container Type</label>
                <select value={form.containerType || "40ft"} onChange={e => set("containerType", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  {["20ft", "40ft", "40ft HC"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Container Value ($)</label>
                <input type="number" min={0} value={form.containerValue ?? ""} onChange={e => set("containerValue", Number(e.target.value))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. 25000" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Vessel Name</label>
                <input value={form.vessel || ""} onChange={e => set("vessel", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. MSC ANYA" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">ETD (Departure)</label>
                <DatePicker
                  value={form.etd || ""}
                  onChange={v => set("etd", v)}
                  placeholder="Select departure date"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">ETA (Arrival)</label>
                <DatePicker
                  value={form.eta || ""}
                  onChange={v => set("eta", v)}
                  placeholder="Select arrival date"
                />
              </div>
            </div>
          )}

          {/* Produce-specific */}
          {form.type === "produce" && (
            <div className="p-4 rounded-xl" style={{ background: "#f0fdf4" }}>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Farm / Location Details</div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Farm Location</label>
              <input value={form.location || ""} onChange={e => set("location", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                placeholder="e.g. Multan, Punjab" />
            </div>
          )}

          {/* Facility Operations */}
          {isFacility && (
            <div className="p-4 rounded-xl border border-emerald-100" style={{ background: "#f0fdf4" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full shrink-0" style={{ background: EMERALD }} />
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Facility Operations</div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Operational details shown on the facility opportunity profile.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Location</label>
                  <input value={form.location || ""} onChange={e => set("location", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="e.g. Depalpur, Okara, Punjab" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Facility Category</label>
                  <input value={form.productCategory || ""} onChange={e => set("productCategory", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="e.g. Rice processing" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Current Stage</label>
                  <input value={form.currentProjectStage || ""} onChange={e => set("currentProjectStage", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="e.g. Site development" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Expected Completion</label>
                  <input value={form.completion || ""} onChange={e => set("completion", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="e.g. December 2027" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Operating Timeline</label>
                  <input value={form.timeline || ""} onChange={e => set("timeline", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="e.g. Q4 2026 – Q2 2027" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Display Order</label>
                  <input type="number" value={form.sortOrder ?? 0} onChange={e => set("sortOrder", Number(e.target.value))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                    placeholder="e.g. 1" min={0} />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60" style={{ background: EMERALD }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { ProjectModal, emptyForm }
