import { useState } from "react"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Send } from "lucide-react"

export type QuoteProduct = {
  id?: number | string
  name: string
  slug?: string
} | null

type RequestQuoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: QuoteProduct
}

const emptyForm = {
  fullName: "",
  email: "",
  company: "",
  country: "",
  quantity: "",
  deliveryTerm: "",
  message: "",
}

export function RequestQuoteDialog({ open, onOpenChange, product }: RequestQuoteDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const productLabel = product?.name || product?.slug || "this product"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSubmitting(true)
    try {
      const res = await api.post<{ mail_sent?: boolean; message?: string; mail_error?: string }>("/api/contact", {
        name: form.fullName,
        email: form.email,
        phone: "",
        subject: `Quote Request: ${product.name || product.slug}`,
        message: `Company: ${form.company}\nCountry: ${form.country}\nQuantity: ${form.quantity}\nDelivery: ${form.deliveryTerm}\n\n${form.message}`,
        type: "public_quote",
        meta: {
          product_id: product.id ? Number(product.id) : undefined,
          product_name: product.name || product.slug,
          company: form.company,
          country: form.country,
          quantity: form.quantity,
          delivery_term: form.deliveryTerm,
        },
      })
      onOpenChange(false)
      setForm(emptyForm)
      if (res?.mail_sent === false) {
        const reason = res.mail_error || res.message || "Email delivery failed."
        toast({
          title: "Email not sent",
          description: `Your quotation request was saved, but we could not email sales@ogexports.co. ${reason}`,
          variant: "destructive" as any,
        })
      } else {
        toast({
          title: "Quotation Requested ✓",
          description:
            "Your request was saved and emailed to sales@ogexports.co. Our sales team will respond within 1 business day.",
        })
      }
    } catch (err: unknown) {
      let detail = ""
      if (err instanceof ApiError) {
        const firstValidation = err.errors
          ? String(Object.values(err.errors).flat()[0] || "")
          : ""
        detail = firstValidation || err.message
      } else if (err instanceof Error) {
        detail = err.message
      }
      toast({
        title: "Request failed",
        description: detail || "Please try again or email sales@ogexports.co",
        variant: "destructive" as any,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card border-border max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Request Quotation</DialogTitle>
          <DialogDescription>
            Get a custom price for <strong>{productLabel}</strong>. We'll respond within 1 business day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name *</label>
              <Input placeholder="Your full name" required value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email *</label>
              <Input type="email" placeholder="you@company.com" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Name</label>
              <Input placeholder="Trade Co. Ltd" value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination Country *</label>
              <Input placeholder="United Kingdom" required value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity Required *</label>
              <Input placeholder="e.g. 2 × 40ft containers" required value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Term</label>
              <Input placeholder="CIF / FOB / CFR" value={form.deliveryTerm}
                onChange={(e) => setForm({ ...form, deliveryTerm: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Special Requirements</label>
            <Textarea placeholder="Packaging preferences, certifications needed, labelling, sample request…"
              className="resize-none h-24" value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <Button type="submit" className="w-full h-12 text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={submitting}>
            {submitting ? "Submitting…" : <><Send className="w-4 h-4" /> Submit Quotation Request</>}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Or email us directly at{" "}
            <a href="mailto:sales@ogexports.co" className="text-accent hover:underline">sales@ogexports.co</a>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
