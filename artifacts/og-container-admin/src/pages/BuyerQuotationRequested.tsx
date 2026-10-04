import { useEffect, useState } from "react"
import { Link } from "wouter"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  CheckCircle2, FileText, Clock, ArrowRight, ShoppingCart, ClipboardList,
} from "lucide-react"

interface StoredRfq {
  id: number
  reference: string
  product_name?: string
  qty?: string
  incoterm?: string
}

function readLastRfqs(): StoredRfq[] {
  try {
    const raw = localStorage.getItem("og_last_rfq_ids")
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function BuyerQuotationRequested() {
  const [rfqs, setRfqs] = useState<StoredRfq[]>([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    setRfqs(readLastRfqs())
    setTimeout(() => setShow(true), 100)
  }, [])

  return (
    <BuyerPortalLayout
      title="Quotation Requested"
      subtitle="Your request has been submitted to our export team"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div
          className={`rounded-2xl p-8 text-center transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          style={{ background: "linear-gradient(135deg, #0F3D2E, #1a5c44)", color: "#F7F7F2" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#4CAF5030", border: "2px solid #4CAF5060" }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "#4CAF50" }} />
          </div>
          <h1 className="font-heading font-bold text-2xl mb-2">Quotation Generated</h1>
          <p className="text-sm opacity-80 mb-4 max-w-md mx-auto">
            Your quotation request has been received. Our admin team will review your requirements
            and reply or contact you soon.
          </p>
          {rfqs.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {rfqs.map(rfq => (
                <div
                  key={rfq.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                  style={{ background: "#C6A969", color: "#1F2933" }}
                >
                  <FileText className="w-4 h-4" />
                  {rfq.reference}
                </div>
              ))}
            </div>
          )}
        </div>

        {rfqs.length > 0 && (
          <Card className="glass-card">
            <CardContent className="p-5 space-y-3">
              <p className="text-xs font-semibold">Submitted requests</p>
              {rfqs.map(rfq => (
                <div
                  key={rfq.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{rfq.reference}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[rfq.product_name, rfq.qty, rfq.incoterm].filter(Boolean).join(" · ") || "RFQ submitted"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                    Pending
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs font-semibold">What happens next</p>
            {[
              { icon: Clock, title: "Team review", desc: "Our export team reviews destination, Incoterm, and product requirements." },
              { icon: FileText, title: "Custom quotation", desc: "You will receive a formal quotation with freight, insurance, and fees where applicable." },
              { icon: ClipboardList, title: "Accept & proceed", desc: "Review the quote under Quotations, then accept to convert it into an order." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#C6A96920" }}>
                  <Icon className="w-4 h-4" style={{ color: "#C6A969" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1 gap-2 font-bold" style={{ background: "#0F3D2E", color: "#F7F7F2" }}>
            <Link href="/buyer/rfq">
              View RFQs <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 gap-2">
            <Link href="/buyer/catalogue">
              <ShoppingCart className="w-4 h-4" /> Continue shopping
            </Link>
          </Button>
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
