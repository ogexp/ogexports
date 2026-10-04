import { useEffect, useRef, useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Package, Plus, Search, CheckCircle2, XCircle, Trash2, Star, X, Edit2, Save, DollarSign, ImagePlus, Loader2, Upload } from "lucide-react"
import {
  getProducts, getCategories, subscribeProducts, refreshProducts, refreshCategories,
  updateProductStatus, deleteProduct, addProduct, updateProduct,
  type AdminProduct, type AdminCategory,
} from "@/lib/admin-data"
import { resolveMediaUrl, uploadProductImages, api, toStoredMediaPath, ApiError } from "@/lib/api"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const CATEGORY_COLORS = ["#f59e0b", GREEN, "#f97316", "#ef4444", "#8b5cf6", "#64748b", "#0ea5e9", "#14b8a6"]
const CATEGORY_ICONS = ["🌾", "🥭", "🥜", "🌶️", "🫘", "🏭", "📦", "🌿"]

function categoryMeta(index: number) {
  return {
    image: CATEGORY_ICONS[index % CATEGORY_ICONS.length],
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }
}

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: "#f0fdf4", color: GREEN, label: "Approved" },
  pending: { bg: "#fffbeb", color: "#f59e0b", label: "Pending" },
  rejected: { bg: "#fef2f2", color: "#ef4444", label: "Rejected" },
  draft: { bg: "#f8fafc", color: "#94a3b8", label: "Draft" },
}

const ORIGINS = ["Punjab, PK", "Sindh, PK", "KPK, PK", "Balochistan, PK", "Gilgit, PK"]
const INCOTERMS_LIST = ["FOB", "CIF", "CFR", "DAP", "EXW"]

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success", onClose }: { msg: string; type?: "success" | "error"; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm" style={{ background: type === "success" ? EMERALD : "#ef4444" }}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, msg, onConfirm, onCancel }: { title: string; msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: "#fef2f2" }}>
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="font-bold text-lg text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{msg}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Tag Input ─────────────────────────────────────────────────────────────────
function TagInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [input, setInput] = useState("")
  const add = (v: string) => { const t = v.trim(); if (t) onChange([...values.filter(x => x !== t), t]); setInput("") }
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted border border-border/60">
              {v}
              <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-500 ml-0.5 leading-none font-bold">×</button>
            </span>
          ))}
        </div>
      )}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if ((e.key === "Enter" || e.key === ",") && input.trim()) { e.preventDefault(); add(input) } }}
        onBlur={() => { if (input.trim()) add(input) }}
        placeholder={placeholder || "Type then press Enter to add"}
        className="w-full border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary" />
    </div>
  )
}

// ── Specs Editor ──────────────────────────────────────────────────────────────
function SpecsEditor({ specs, onChange }: { specs: { label: string; value: string }[]; onChange: (s: { label: string; value: string }[]) => void }) {
  const add = () => onChange([...specs, { label: "", value: "" }])
  const remove = (i: number) => onChange(specs.filter((_, j) => j !== i))
  const update = (i: number, k: "label" | "value", v: string) => {
    const next = [...specs]; next[i] = { ...next[i], [k]: v }; onChange(next)
  }
  return (
    <div className="space-y-2">
      {specs.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input value={s.label} onChange={e => update(i, "label", e.target.value)}
            placeholder="Label (e.g. Variety)" className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary" />
          <input value={s.value} onChange={e => update(i, "value", e.target.value)}
            placeholder="Value (e.g. Basmati 1121)" className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary" />
          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-lg px-1 shrink-0 leading-none">×</button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="text-xs font-semibold text-primary/70 border border-dashed border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 w-full transition-colors">
        + Add Spec Row
      </button>
    </div>
  )
}

// ── Product Form (Add + Edit) ─────────────────────────────────────────────────
const defaultForm = (p?: AdminProduct, categories: AdminCategory[] = []) => ({
  name: p?.name ?? "",
  category: p?.category ?? categories[0]?.name ?? "",
  categoryId: p?.categoryId ?? categories[0]?.id ?? null,
  sku: p?.sku ?? "",
  price: p?.price ?? "",
  fob: p?.fob ?? "",
  incoterms: p?.incoterms ?? "FOB",
  minOrder: p?.minOrder ?? "",
  origin: p?.origin ?? ORIGINS[0],
  status: p?.status ?? ("pending" as AdminProduct["status"]),
  stock: p?.stock ?? "Available",
  rating: p?.rating ?? 0,
  orders: p?.orders ?? 0,
  description: p?.description ?? "",
  shortDescription: p?.shortDescription ?? "",
  videoUrl: p?.videoUrl ?? "",
  imageUrl: p?.imageUrl ?? "",
  imagePath: p?.imagePath ?? "",
  labReportPath: p?.labReportPath ?? "",
  labReportUrl: p?.labReportUrl ?? "",
  galleryPaths: (p?.galleryPaths ?? []) as string[],
  galleryUrls: (p?.galleryUrls ?? []) as string[],
  slug: p?.slug ?? "",
  featured: p?.featured ?? false,
  hsCode: p?.hsCode ?? "",
  leadTime: p?.leadTime ?? "",
  moq: p?.moq ?? "",
  shelfLife: p?.shelfLife ?? "",
  storageInstructions: p?.storageInstructions ?? "",
  specs: p?.specs ?? ([] as { label: string; value: string }[]),
  certifications: p?.certifications ?? ([] as string[]),
  paymentTerms: p?.paymentTerms ?? ([] as string[]),
  deliveryTerms: p?.deliveryTerms ?? ([] as string[]),
  packagingOptions: p?.packagingOptions ?? ([] as string[]),
  exportMarkets: p?.exportMarkets ?? ([] as string[]),
})

type ProductFormState = ReturnType<typeof defaultForm>

type SavePayload = ProductFormState & {
  imagePath: string
  galleryPaths: string[]
  categoryId: number | null
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pt-1">
      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: GOLD }} />
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  )
}

function ProductModal({
  editing, categories, onSave, onClose
}: {
  editing: AdminProduct | null
  categories: AdminCategory[]
  onSave: (form: SavePayload, id?: string) => Promise<void>
  onClose: () => void
}) {
  const isEdit = !!editing
  const [form, setForm] = useState(() => defaultForm(editing ?? undefined, categories))
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const [primaryFile, setPrimaryFile] = useState<File | null>(null)
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [existingGallery, setExistingGallery] = useState<string[]>(() => editing?.galleryPaths ?? [])
  const [existingPrimary, setExistingPrimary] = useState<string>(editing?.imagePath ?? "")
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (primaryPreview) URL.revokeObjectURL(primaryPreview)
      galleryPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [primaryPreview, galleryPreviews])

  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm(f => ({
        ...f,
        categoryId: categories[0].id,
        category: categories[0].name,
      }))
    }
  }, [categories, form.categoryId])

  const pickPrimary = (file: File | null) => {
    if (primaryPreview) URL.revokeObjectURL(primaryPreview)
    if (!file) {
      setPrimaryFile(null)
      setPrimaryPreview(null)
      return
    }
    setPrimaryFile(file)
    setPrimaryPreview(URL.createObjectURL(file))
  }

  const pickGallery = (files: FileList | null) => {
    if (!files?.length) return
    const next = Array.from(files).slice(0, 12 - existingGallery.length - galleryFiles.length)
    const urls = next.map((f) => URL.createObjectURL(f))
    setGalleryFiles((prev) => [...prev, ...next])
    setGalleryPreviews((prev) => [...prev, ...urls])
  }

  const removeGalleryFile = (index: number) => {
    setGalleryPreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.sku.trim() || saving) return
    setSaving(true)
    setUploadError("")
    try {
      let imagePath = existingPrimary
      let galleryPaths = [...existingGallery]

      const filesToUpload: File[] = []
      if (primaryFile) filesToUpload.push(primaryFile)
      if (galleryFiles.length) filesToUpload.push(...galleryFiles)

      if (filesToUpload.length) {
        const uploaded = await uploadProductImages(form.name.trim(), filesToUpload)
        let cursor = 0
        if (primaryFile) {
          imagePath = uploaded[cursor++] ?? imagePath
        }
        if (galleryFiles.length) {
          galleryPaths = [...galleryPaths, ...uploaded.slice(cursor)]
        }
      }

      // Avoid duplicating primary in gallery
      galleryPaths = galleryPaths.filter((p) => p && p !== imagePath)

      await onSave({
        ...form,
        imagePath,
        imageUrl: resolveMediaUrl(imagePath),
        galleryPaths,
        galleryUrls: galleryPaths.map(resolveMediaUrl),
      }, editing?.id)
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.errors ? Object.values(err.errors).flat()[0] : err.message)
        : (err as Error)?.message || "Failed to save product images."
      setUploadError(msg)
    } finally {
      setSaving(false)
    }
  }

  const primaryDisplay = primaryPreview || (existingPrimary ? resolveMediaUrl(existingPrimary) : "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={saving ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-bold text-base">{isEdit ? `Edit — ${editing!.name}` : "Add New Product"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Changes are reflected live on the buyer-facing product catalog</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── 1. Basic Info ── */}
          <SectionHeader label="Basic Info" />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Product Name *</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. Basmati Rice 1121" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Category *</label>
              <select
                value={form.categoryId != null ? String(form.categoryId) : ""}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null
                  const cat = categories.find(c => c.id === id)
                  setForm(f => ({
                    ...f,
                    categoryId: id,
                    category: cat?.name ?? "",
                  }))
                }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background"
                required
              >
                {categories.length === 0 && <option value="">Loading categories…</option>}
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">SKU *</label>
              <input required value={form.sku} onChange={e => set("sku", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. RICE-BAS-1121" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Origin</label>
              <select value={form.origin} onChange={e => set("origin", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background">
                {ORIGINS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Stock Status</label>
              <select value={form.stock} onChange={e => set("stock", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background">
                {["Available", "Limited", "Seasonal", "Out of Stock"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Catalog Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value as AdminProduct["status"])}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-background">
                <option value="approved">Approved (live)</option>
                <option value="pending">Pending Review</option>
                <option value="draft">Draft (hidden)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* ── 2. Catalog Identity ── */}
          <div className="p-4 rounded-xl border border-border/50 bg-slate-50 space-y-3">
            <SectionHeader label="Catalog Identity — Buyer-Facing" />
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Primary Product Image</label>
              <input
                ref={primaryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => pickPrimary(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-start gap-3">
                {primaryDisplay ? (
                  <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-border bg-white">
                    <img src={primaryDisplay} alt="Primary preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        pickPrimary(null)
                        setExistingPrimary("")
                        if (primaryInputRef.current) primaryInputRef.current.value = ""
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500"
                      title="Remove primary image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => primaryInputRef.current?.click()}
                    className="w-36 h-28 rounded-lg border border-dashed border-primary/40 bg-white flex flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:bg-primary/5"
                  >
                    <ImagePlus className="w-5 h-5 text-primary/70" />
                    Upload primary
                  </button>
                )}
                {primaryDisplay && (
                  <button
                    type="button"
                    onClick={() => primaryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-xs font-semibold hover:bg-muted"
                  >
                    <Upload className="w-3.5 h-3.5" /> Replace
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">JPG, PNG, WEBP or GIF · max 5MB. Stored under /uploads/product-images/</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Gallery Images</label>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  pickGallery(e.target.files)
                  if (galleryInputRef.current) galleryInputRef.current.value = ""
                }}
              />
              <div className="flex flex-wrap gap-2">
                {existingGallery.map((path, i) => (
                  <div key={`existing-${path}-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-white">
                    <img src={resolveMediaUrl(path)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setExistingGallery((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {galleryPreviews.map((url, i) => (
                  <div key={`new-${url}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-white">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryFile(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(existingGallery.length + galleryFiles.length) < 12 && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border border-dashed border-primary/40 bg-white flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4 text-primary/70" />
                    Add
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">Up to 12 gallery images. Primary image is not duplicated here.</p>
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-600">
                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">URL Slug</label>
                <input value={form.slug} onChange={e => set("slug", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. basmati-rice-1121" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Featured on Homepage</label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.featured} onChange={e => set("featured", e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-emerald-600" />
                  <span className="text-sm font-medium">{form.featured ? "✓ Featured" : "Not featured"}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Short Description (Catalog Card)</label>
              <input value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                placeholder="One-liner shown on the product grid card" />
            </div>
          </div>

          {/* ── 3. Pricing & FOB ── */}
          <div className="p-4 rounded-xl border-2" style={{ borderColor: `${GOLD}40`, background: "#fffdf5" }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4" style={{ color: GOLD }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: GOLD }}>Pricing & FOB Rates</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">FOB Rate</label>
                <input value={form.fob} onChange={e => set("fob", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. $1,100/MT" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Default Incoterm</label>
                <select value={form.incoterms} onChange={e => set("incoterms", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                  {INCOTERMS_LIST.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Min Order (quick)</label>
                <input value={form.minOrder} onChange={e => set("minOrder", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                  placeholder="e.g. 25 MT" />
              </div>
            </div>
          </div>

          {/* ── 4. Trade Details ── */}
          <SectionHeader label="Trade Details" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">MOQ (Full description)</label>
              <input value={form.moq} onChange={e => set("moq", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 1 × 40ft Container (~27 MT)" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Lead Time</label>
              <input value={form.leadTime} onChange={e => set("leadTime", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 7–12 Business Days" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">HS Code</label>
              <input value={form.hsCode} onChange={e => set("hsCode", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 1006.30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Shelf Life</label>
              <input value={form.shelfLife} onChange={e => set("shelfLife", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 24 months in cool dry storage" />
            </div>
          </div>

          {/* ── 5. Specs Editor ── */}
          <div>
            <SectionHeader label="Product Specifications" />
            <SpecsEditor
              specs={form.specs}
              onChange={v => set("specs", v)}
            />
          </div>

          {/* ── 6. Certifications ── */}
          <TagInput
            label="Certifications"
            values={form.certifications}
            onChange={v => set("certifications", v)}
            placeholder="e.g. Phytosanitary — press Enter to add"
          />

          {/* ── 7. Commercial Terms ── */}
          <SectionHeader label="Commercial Terms" />
          <div className="grid grid-cols-3 gap-4">
            <TagInput
              label="Payment Terms"
              values={form.paymentTerms}
              onChange={v => set("paymentTerms", v)}
              placeholder="e.g. LC at Sight"
            />
            <TagInput
              label="Delivery Terms"
              values={form.deliveryTerms}
              onChange={v => set("deliveryTerms", v)}
              placeholder="e.g. FOB Karachi"
            />
            <TagInput
              label="Packaging Options"
              values={form.packagingOptions}
              onChange={v => set("packagingOptions", v)}
              placeholder="e.g. 25 KG Bag"
            />
          </div>

          {/* ── 8. Export Markets ── */}
          <TagInput
            label="Export Markets"
            values={form.exportMarkets}
            onChange={v => set("exportMarkets", v)}
            placeholder="e.g. UAE, Germany — press Enter"
          />

          {/* ── 9. Description ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Full Product Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
              placeholder="Detailed description shown on the product detail page..." />
          </div>

          {/* ── 10. Media ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Product Video URL <span className="text-[10px] font-normal normal-case text-muted-foreground">(max 20 sec — mp4/webm)</span>
            </label>
            <input value={form.videoUrl} onChange={e => set("videoUrl", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="https://example.com/product-video.mp4" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
              Product Report (PDF / Word)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-semibold cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {form.labReportPath ? "Replace Report" : "Upload Report"}
                <input
                  type="file"
                  accept="application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (!file) return
                    const allowedMimes = [
                      "application/pdf",
                      "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    ]
                    const ext = file.name.split(".").pop()?.toLowerCase() || ""
                    const allowedExts = ["pdf", "doc", "docx"]
                    if (!allowedMimes.includes(file.type) && !allowedExts.includes(ext)) {
                      alert("Only PDF or Word files (.pdf, .doc, .docx) are allowed for the product report.")
                      return
                    }
                    try {
                      const formData = new FormData()
                      formData.append("file", file)
                      formData.append("category", "product-reports")
                      formData.append("folder", "product_lab_reports")
                      const uploadRes = await api.upload<{ data: { url?: string; path?: string } }>("/api/uploads", formData)
                      const stored = toStoredMediaPath(uploadRes.data?.path || uploadRes.data?.url)
                        || uploadRes.data?.path
                        || uploadRes.data?.url
                      if (!stored) throw new ApiError("Upload did not return a file path", 500)
                      set("labReportPath", stored)
                      set("labReportUrl", resolveMediaUrl(stored))
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Report upload failed")
                    }
                  }}
                />
              </label>
              {form.labReportPath && (
                <>
                  <a
                    href={form.labReportUrl || resolveMediaUrl(form.labReportPath)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary underline"
                  >
                    View current file
                  </a>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-500"
                    onClick={() => { set("labReportPath", ""); set("labReportUrl", "") }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-70" style={{ background: EMERALD }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AdminProducts() {
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<AdminProduct[]>(() => getProducts())
  const [categories, setCategories] = useState<AdminCategory[]>(() => getCategories())
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)

  useEffect(() => {
    const unsub = subscribeProducts(() => setProducts(getProducts()))
    void Promise.all([refreshProducts(), refreshCategories()]).then(([, cats]) => {
      setProducts(getProducts())
      setCategories(cats)
    })
    return unsub
  }, [])

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const refresh = () => setProducts(getProducts())

  const handleApprove = (id: string, name: string) => {
    updateProductStatus(id, "approved"); refresh()
    showToast(`✓ Product "${name}" approved`)
  }
  const handleReject = (id: string, name: string) => {
    updateProductStatus(id, "rejected"); refresh()
    showToast(`"${name}" unpublished`, "error")
  }
  const handleDelete = () => {
    if (!deleteTarget) return
    deleteProduct(deleteTarget.id); refresh()
    showToast(`Product "${deleteTarget.name}" deleted`)
    setDeleteTarget(null)
  }

  const handleSave = async (form: SavePayload, id?: string) => {
    try {
      if (id) {
        await updateProduct(id, form)
        showToast(`✓ "${form.name}" updated`)
      } else {
        await addProduct(form)
        showToast(`✓ "${form.name}" added`)
      }
      refresh()
      setShowModal(false)
      setEditingProduct(null)
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.errors ? Object.values(err.errors).flat()[0] : err.message)
        : (err as Error)?.message || "Failed to save product."
      showToast(msg, "error")
      throw err
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchTab = activeTab === "pending" ? p.status === "pending"
      : activeTab === "fob" ? true
      : true
    return matchSearch && matchTab
  })

  const pendingCount = products.filter(p => p.status === "pending").length

  const catStats = categories.map((c, i) => ({
    ...c,
    ...categoryMeta(i),
    products: products.filter(p => p.categoryId === c.id || p.category === c.name).length,
    approved: products.filter(p => (p.categoryId === c.id || p.category === c.name) && p.status === "approved").length,
  }))

  return (
    <AdminLayout title="Product Management" subtitle="Manage product catalogue, FOB rates, approvals and categories">
      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Products", value: String(products.length), color: EMERALD },
            { label: "Pending Approval", value: String(pendingCount), color: "#f59e0b" },
            { label: "Approved", value: String(products.filter(p => p.status === "approved").length), color: GREEN },
            { label: "With FOB Rates", value: String(products.filter(p => p.fob && p.fob.trim()).length), color: GOLD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between p-4 border-b border-border gap-3 flex-wrap">
            <div className="flex gap-1 overflow-x-auto">
              {[
                { id: "all", label: `All (${products.length})` },
                { id: "pending", label: `Pending (${pendingCount})` },
                { id: "fob", label: "FOB Rates" },
                { id: "categories", label: "Categories" },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                  style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditingProduct(null); setShowModal(true) }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap"
              style={{ background: EMERALD }}>
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>

          <div className="p-5">
            {activeTab !== "categories" && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {/* FOB Rates tab */}
            {activeTab === "fob" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Product", "FOB Rate (Karachi)", "Incoterm", "Min Order", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-[13px]">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.category}</div>
                        </td>
                        <td className="px-3 py-3">
                          {p.fob ? (
                            <span className="text-[12px] font-bold" style={{ color: GOLD }}>{p.fob}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Not set — click Edit</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "#f0fdf4", color: EMERALD }}>{p.incoterms || "FOB"}</span>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{p.minOrder || "—"}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => { setEditingProduct(p); setShowModal(true) }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:opacity-80 transition-colors text-white"
                            style={{ background: GOLD, color: "#1F2933" }}>
                            <Edit2 className="w-3 h-3" /> Edit Rate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* All + Pending tab */}
            {activeTab !== "categories" && activeTab !== "fob" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Product", "Category", "SKU", "FOB Rate", "Min Order", "Origin", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const st = STATUS_MAP[p.status] || STATUS_MAP.draft
                      const thumb = p.imageUrl || resolveMediaUrl(p.imagePath || "")
                      return (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                                {thumb ? (
                                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-[13px]">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">{p.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{p.category}</td>
                          <td className="px-3 py-3 text-[10px] font-mono text-muted-foreground">{p.sku}</td>
                          <td className="px-3 py-3">
                            {p.fob ? <span className="text-[11px] font-bold" style={{ color: GOLD }}>{p.fob}</span>
                              : <span className="text-[10px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{p.minOrder}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{p.origin}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditingProduct(p); setShowModal(true) }}
                                className="p-1 rounded hover:bg-muted transition-colors" title="Edit">
                                <Edit2 className="w-3 h-3 text-muted-foreground" />
                              </button>
                              {p.status === "pending" && (
                                <>
                                  <button onClick={() => handleApprove(p.id, p.name)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-100 transition-colors">Approve</button>
                                  <button onClick={() => handleReject(p.id, p.name)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">Reject</button>
                                </>
                              )}
                              {p.status === "approved" && <button onClick={() => handleReject(p.id, p.name)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-600 hover:bg-yellow-100">Unpublish</button>}
                              {p.status === "rejected" && <button onClick={() => handleApprove(p.id, p.name)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-100">Re-approve</button>}
                              <button onClick={() => setDeleteTarget(p)} className="p-1 rounded hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-sm text-muted-foreground">No products found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catStats.map(c => (
                  <div key={c.id} className="p-4 border border-border rounded-xl hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{c.image}</span>
                      <div>
                        <div className="font-semibold text-sm">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{c.products} products · {c.approved} approved</div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: c.products > 0 ? `${(c.approved / c.products) * 100}%` : "0%", background: c.color }} />
                    </div>
                  </div>
                ))}
                {catStats.length === 0 && (
                  <div className="col-span-full text-center py-8 text-sm text-muted-foreground">No categories loaded from API</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ProductModal
          editing={editingProduct}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProduct(null) }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Product?"
          msg={`"${deleteTarget.name}" will be permanently removed from the catalogue.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
