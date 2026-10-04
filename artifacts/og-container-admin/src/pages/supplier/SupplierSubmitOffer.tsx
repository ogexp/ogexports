import { useState, useRef } from "react"
import { notify } from "@/lib/notify"
import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package, MapPin, Scale, Tag, Calendar, Shield,
  ChevronRight, CheckCircle2, Upload, Info, Leaf,
  Wheat, Apple, Fish, Milk, FlaskConical, AlertCircle, ImageIcon, X, Video
} from "lucide-react"
import { addSupplierOffer, uploadOfferMedia } from "@/lib/admin-data"
import { useCurrency, isPakistanCountry } from "@/lib/use-currency"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { ApiError } from "@/lib/api"

const CATEGORIES = [
  { value: "fruits",      label: "Fresh Fruits",       icon: Apple },
  { value: "vegetables",  label: "Vegetables",          icon: Leaf },
  { value: "grains",      label: "Grains & Cereals",    icon: Wheat },
  { value: "rice",        label: "Rice & Pulses",        icon: Package },
  { value: "seafood",     label: "Seafood",              icon: Fish },
  { value: "dairy",       label: "Dairy & Eggs",         icon: Milk },
  { value: "spices",      label: "Spices & Herbs",       icon: FlaskConical },
  { value: "other",       label: "Other Commodity",      icon: Package },
]

const CERTIFICATIONS = ["HACCP", "ISO 22000", "GlobalG.A.P.", "Organic", "Halal", "BRC", "FDA Registered", "Phytosanitary"]

const PAYMENT_TERMS = ["Cash", "15 Days", "30 Days"]

interface FormData {
  productName: string
  category: string
  origin: string
  specifications: string
  priceFob: string
  availableQty: string
  moq: string
  unit: string
  leadTime: string
  packaging: string
  paymentTerms: string
  validUntil: string
  hsCode: string
  certifications: string[]
  remarks: string
  images: string[]
  video: string
}

const EMPTY: FormData = {
  productName: "", category: "", origin: "", specifications: "",
  priceFob: "", availableQty: "", moq: "", unit: "MT",
  leadTime: "", packaging: "", paymentTerms: "", validUntil: "",
  hsCode: "", certifications: [], remarks: "", images: [], video: ""
}

export default function SupplierSubmitOffer() {
  const c = useCurrency()
  const auth = useSafeAuth()
  const isPakistanMarket = isPakistanCountry(c.country || auth.country)
  const [form, setForm] = useState<FormData>(() => ({
    ...EMPTY,
    unit: isPakistanCountry(c.country || "") ? "40 KG Bag" : "MT",
  }))
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const imgRef0 = useRef<HTMLInputElement>(null)
  const imgRef1 = useRef<HTMLInputElement>(null)
  const imgRef2 = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const imgRefs = [imgRef0, imgRef1, imgRef2]

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: "" }))
  }

  function toggleCert(cert: string) {
    setForm(f => ({
      ...f,
      certifications: f.certifications.includes(cert)
        ? f.certifications.filter(x => x !== cert)
        : [...f.certifications, cert]
    }))
  }

  function handleImageFile(idx: number, file?: File) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { notify.error("File too large", "Image must be under 2 MB."); return }
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      setForm(f => {
        const imgs = [...(f.images || []), "", "", ""].slice(0, 3)
        imgs[idx] = url
        return { ...f, images: imgs }
      })
      setImageFiles(prev => {
        const next = [...prev]
        next[idx] = file
        return next
      })
    }
    reader.readAsDataURL(file)
  }

  function removeImage(idx: number) {
    setForm(f => {
      const imgs = [...(f.images || []), "", "", ""].slice(0, 3)
      imgs[idx] = ""
      return { ...f, images: imgs }
    })
    setImageFiles(prev => {
      const next = [...prev]
      next[idx] = null
      return next
    })
  }

  function handleVideoFile(file?: File) {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { notify.error("File too large", "Video must be under 25 MB."); return }
    const preview = URL.createObjectURL(file)
    setForm(f => ({ ...f, video: preview }))
    setVideoFile(file)
  }

  function removeVideo() {
    setForm(f => ({ ...f, video: "" }))
    setVideoFile(null)
    if (videoRef.current) videoRef.current.value = ""
  }

  function validateStep1() {
    const e: typeof errors = {}
    if (!form.productName.trim()) e.productName = "Product name is required"
    if (!form.category) e.category = "Please select a category"
    if (!form.origin.trim()) e.origin = "Origin / city is required"
    if (!form.specifications.trim()) e.specifications = "Please describe the product"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: typeof errors = {}
    if (!form.priceFob.trim()) e.priceFob = isPakistanMarket ? "DAP price is required" : "FOB price is required"
    if (!form.availableQty.trim()) e.availableQty = "Available quantity is required"
    if (!form.moq.trim()) e.moq = "MOQ is required"
    if (!form.leadTime.trim()) e.leadTime = "Lead time is required"
    if (!form.packaging.trim()) e.packaging = "Packaging details are required"
    if (!form.paymentTerms) e.paymentTerms = "Please select payment terms"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2)
    if (step === 2 && validateStep2()) setStep(3)
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      const uploadedImages: string[] = []
      for (const file of imageFiles) {
        if (!file) continue
        uploadedImages.push(await uploadOfferMedia(file, "image"))
      }
      let uploadedVideo: string | undefined
      if (videoFile) {
        uploadedVideo = await uploadOfferMedia(videoFile, "video")
      }

      const currency = isPakistanMarket ? "PKR" : "USD"
      const priceRaw = form.priceFob.trim()
      const priceWithCurrency = /(PKR|USD|\$)/i.test(priceRaw)
        ? priceRaw
        : isPakistanMarket ? `PKR ${priceRaw}` : `$${priceRaw}`

      const id = await addSupplierOffer({
        supplierId: String(auth.userId || ""),
        supplierName: auth.displayName || "Supplier",
        supplierCountry: isPakistanMarket ? "Pakistan" : (auth.country || "International"),
        supplierVerified: false,
        category: form.category,
        productName: form.productName,
        origin: form.origin,
        specifications: form.specifications,
        availableQty: `${form.availableQty} ${form.unit}`.trim(),
        priceFob: `${priceWithCurrency} / ${form.unit}`,
        currency,
        incoterm: isPakistanMarket ? "DAP" : "FOB",
        priceUnit: form.unit,
        moq: `${form.moq} ${form.unit}`.trim(),
        leadTime: form.leadTime,
        packaging: form.packaging,
        paymentTerms: form.paymentTerms,
        certifications: form.certifications,
        validUntil: form.validUntil,
        hsCode: isPakistanMarket ? "" : form.hsCode,
        remarks: form.remarks || undefined,
        status: "pending",
        submittedAt: new Date().toISOString().slice(0, 10),
        images: uploadedImages,
        video: uploadedVideo,
      })
      setSubmittedId(id)
      setSubmitted(true)
      notify.success("Offer submitted", "Your offer has been saved and is under review.")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not save offer. Please try again."
      notify.error("Submit failed", msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleReset() {
    setForm({ ...EMPTY, unit: isPakistanMarket ? "40 KG Bag" : "MT" })
    setImageFiles([null, null, null])
    setVideoFile(null)
    setErrors({})
    setStep(1)
    setSubmitted(false)
    setSubmittedId("")
  }

  if (submitted) {
    return (
      <SupplierPortalLayout title="Submit New Offer" subtitle="Offer submitted successfully">
        <div className="max-w-lg mx-auto pt-8">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-bold">Offer Submitted!</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Your offer for <strong>{form.productName}</strong> has been received. Our sourcing team will review it within 3–5 business days and update the status.
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-left space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Offer ID</span>
                  <span className="font-mono font-semibold">{submittedId}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{isPakistanMarket ? "PKR" : "USD"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium truncate max-w-[180px]">{form.productName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border text-xs">Under Review</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleReset} className="w-full">Submit Another Offer</Button>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/supplier/my-offers">View My Offers</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SupplierPortalLayout>
    )
  }

  return (
    <SupplierPortalLayout title="Submit New Offer" subtitle="Fill in your product details for review by OG Exports sourcing team">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: "Product Info" },
            { n: 2, label: "Pricing & Terms" },
            { n: 3, label: "Review & Submit" },
          ].map(({ n, label }, i, arr) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  step > n ? "bg-emerald-500 text-white" :
                  step === n ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
                </div>
                <span className={`text-xs font-medium hidden sm:block truncate ${step === n ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 rounded ${step > n ? "bg-emerald-500" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            <strong>Confidentiality:</strong> Buyer identities and order volumes are never shared with suppliers. Pricing currency for your account: <strong>{c.symLabel}</strong>.
          </p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Product Name <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.productName ? "border-red-400" : "border-border"}`}
                  placeholder="e.g. Kinnow Mandarin – Premium A-Grade"
                  value={form.productName}
                  onChange={e => set("productName", e.target.value)}
                />
                {errors.productName && <p className="text-xs text-red-500 mt-1">{errors.productName}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Category <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("category", value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                        form.category === value
                          ? "border-primary bg-primary/8 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />Origin City / Region <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.origin ? "border-red-400" : "border-border"}`}
                  placeholder="e.g. Sargodha, Punjab, Pakistan"
                  value={form.origin}
                  onChange={e => set("origin", e.target.value)}
                />
                {errors.origin && <p className="text-xs text-red-500 mt-1">{errors.origin}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Product Specifications <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none ${errors.specifications ? "border-red-400" : "border-border"}`}
                  placeholder="Describe the product: variety, grade, size, color, brix level, moisture content, etc."
                  value={form.specifications}
                  onChange={e => set("specifications", e.target.value)}
                />
                {errors.specifications && <p className="text-xs text-red-500 mt-1">{errors.specifications}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <ImageIcon className="w-3.5 h-3.5 inline mr-1" />Product Images (up to 3)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map(idx => {
                    const imgSrc = (form.images || [])[idx] || ""
                    return (
                      <div key={idx} className="aspect-square">
                        {imgSrc ? (
                          <div className="relative w-full h-full rounded-xl overflow-hidden border border-border group">
                            <img src={imgSrc} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all text-muted-foreground hover:text-primary">
                            <Upload className="w-5 h-5" />
                            <span className="text-xs font-medium">Photo {idx + 1}</span>
                            <input
                              ref={imgRefs[idx]}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={e => handleImageFile(idx, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Upload up to 3 product photos (JPG, PNG, WEBP) — max 2 MB each.</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <Video className="w-3.5 h-3.5 inline mr-1" />Product Video (Optional)
                </label>
                {form.video ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <video src={form.video} controls className="w-full max-h-56 bg-black" />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all text-muted-foreground hover:text-primary py-8">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm font-medium">Upload video (MP4, WEBM, MOV)</span>
                    <span className="text-xs">Max 25 MB</span>
                    <input
                      ref={videoRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={e => handleVideoFile(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <Shield className="w-3.5 h-3.5 inline mr-1" />Certifications (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATIONS.map(cert => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => toggleCert(cert)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${
                        form.certifications.includes(cert)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </div>

              {!isPakistanMarket && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">HS Code (Optional)</label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    placeholder="e.g. 0805.20"
                    value={form.hsCode}
                    onChange={e => set("hsCode", e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" /> Pricing & Commercial Terms
                <Badge variant="outline" className="ml-auto text-xs">{c.symLabel}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    {isPakistanMarket ? "DAP Price — Delivered at Place" : "FOB Price"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.priceFob ? "border-red-400" : "border-border"}`}
                    placeholder={isPakistanMarket ? "e.g. 4200" : "e.g. 820"}
                    value={form.priceFob}
                    onChange={e => set("priceFob", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {isPakistanMarket
                      ? "Enter price in PKR (currency saved as PKR)"
                      : "Enter price in USD (currency saved as USD)"}
                  </p>
                  {errors.priceFob && <p className="text-xs text-red-500 mt-1">{errors.priceFob}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unit / Packaging Size</label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    value={form.unit}
                    onChange={e => set("unit", e.target.value)}
                  >
                    {(isPakistanMarket
                      ? ["40 KG Bag", "25 KG Bag", "20 KG Bag", "50 KG Bag", "KG"]
                      : ["MT", "KG", "Ton", "Box", "Carton", "Pallet", "Container"]
                    ).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    <Scale className="w-3.5 h-3.5 inline mr-1" />Available Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.availableQty ? "border-red-400" : "border-border"}`}
                    placeholder="e.g. 500"
                    value={form.availableQty}
                    onChange={e => set("availableQty", e.target.value)}
                  />
                  {errors.availableQty && <p className="text-xs text-red-500 mt-1">{errors.availableQty}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">MOQ (Min Order Qty) <span className="text-red-500">*</span></label>
                  <input
                    className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.moq ? "border-red-400" : "border-border"}`}
                    placeholder="e.g. 20"
                    value={form.moq}
                    onChange={e => set("moq", e.target.value)}
                  />
                  {errors.moq && <p className="text-xs text-red-500 mt-1">{errors.moq}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />Lead Time <span className="text-red-500">*</span>
                </label>
                <input
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.leadTime ? "border-red-400" : "border-border"}`}
                  placeholder="e.q 7 to 10 Days"
                  value={form.leadTime}
                  onChange={e => set("leadTime", e.target.value)}
                />
                {errors.leadTime && <p className="text-xs text-red-500 mt-1">{errors.leadTime}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Packaging Details <span className="text-red-500">*</span></label>
                <input
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${errors.packaging ? "border-red-400" : "border-border"}`}
                  placeholder="e.q 10 Kg Bag , 20 Kg Bag"
                  value={form.packaging}
                  onChange={e => set("packaging", e.target.value)}
                />
                {errors.packaging && <p className="text-xs text-red-500 mt-1">{errors.packaging}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Accepted Payment Terms <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_TERMS.map(term => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => set("paymentTerms", term)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        form.paymentTerms === term
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
                {errors.paymentTerms && <p className="text-xs text-red-500 mt-1">{errors.paymentTerms}</p>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Offer Valid Until (Optional)</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  value={form.validUntil}
                  onChange={e => set("validUntil", e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Additional Remarks (Optional)</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none"
                  placeholder="Any special conditions, seasonal availability, export experience, references, etc."
                  value={form.remarks}
                  onChange={e => set("remarks", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Review Your Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-muted/20 divide-y">
                {[
                  { label: "Product Name",   value: form.productName },
                  { label: "Category",       value: CATEGORIES.find(x => x.value === form.category)?.label ?? form.category },
                  { label: "Origin",         value: form.origin },
                  { label: "Currency",       value: c.symLabel },
                  { label: isPakistanMarket ? "DAP Price" : "FOB Price", value: `${form.priceFob} / ${form.unit}` },
                  { label: "Available Qty",  value: `${form.availableQty} ${form.unit}` },
                  { label: "MOQ",            value: `${form.moq} ${form.unit}` },
                  { label: "Lead Time",      value: form.leadTime },
                  { label: "Packaging",      value: form.packaging },
                  { label: "Payment Terms",  value: form.paymentTerms },
                  { label: "Valid Until",    value: form.validUntil || "—" },
                  ...(!isPakistanMarket ? [{ label: "HS Code", value: form.hsCode || "—" }] : []),
                  { label: "Certifications", value: form.certifications.length ? form.certifications.join(", ") : "None" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 flex items-start justify-between gap-4 text-sm">
                    <span className="text-muted-foreground shrink-0 w-36">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
              {form.specifications && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Specifications</p>
                  <p className="text-sm">{form.specifications}</p>
                </div>
              )}
              {form.remarks && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Remarks</p>
                  <p className="text-sm">{form.remarks}</p>
                </div>
              )}
              {(form.images || []).filter(Boolean).length > 0 && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Product Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(form.images || []).filter(Boolean).map((src, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={src} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {form.video && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Product Video</p>
                  <video src={form.video} controls className="w-full max-h-48 rounded-lg bg-black" />
                </div>
              )}
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Once submitted, your offer will be reviewed within <strong>3–5 business days</strong>. You will be notified of the status via the portal and messages.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3) : null}
            disabled={step === 1 || submitting}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              style={{ background: "linear-gradient(135deg, #0F3D2E, #2d7a4f)" }}
              className="text-white border-0"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> {submitting ? "Submitting…" : "Submit Offer"}
            </Button>
          )}
        </div>
      </div>
    </SupplierPortalLayout>
  )
}
