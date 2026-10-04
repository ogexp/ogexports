import { FileText, Download, Eye, Shield, CheckCircle2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { useSafeAuth } from "@/lib/use-safe-auth"

const DOC_TYPES = [
  { icon: FileText, name: "Commercial Invoice", description: "Auto-generated from your trade details. Includes all mandatory fields for international clearance.", status: "available" },
  { icon: FileText, name: "Packing List", description: "Detailed gross/net weight, number of packages, and container stuffing report.", status: "available" },
  { icon: FileText, name: "Certificate of Origin", description: "Pakistan origin certificate issued by Chamber of Commerce.", status: "available" },
  { icon: Shield, name: "Phytosanitary Certificate", description: "Plant health certification issued by Pakistan Plant Protection Department for fresh produce.", status: "available" },
  { icon: FileText, name: "Quality Analysis Report", description: "Third-party lab test results for moisture, purity, broken grain %, and foreign matter.", status: "available" },
  { icon: FileText, name: "Bill of Lading", description: "Original BL from shipping line confirming cargo loaded on board.", status: "on-request" },
  { icon: FileText, name: "Weight Certificate", description: "Pre-shipment weight certificate from a licensed surveyor at port of loading.", status: "available" },
  { icon: Lock, name: "Investment Agreement", description: "Legal investment agreement for investors participating in container or project investments.", status: "investors-only" },
]

export default function Documents() {
  const { isSignedIn } = useSafeAuth()

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-card border-b border-border pt-32 pb-16">
        <div className="container px-4 md:px-6 text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Trade Documents
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">
            Complete Documentation for Every Shipment
          </h1>
          <p className="text-lg text-muted-foreground">
            OG Exports provides the full set of internationally recognized trade documents required for customs clearance, letter of credit compliance, and bank presentations.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto space-y-4">
          {DOC_TYPES.map(doc => (
            <Card key={doc.name} className="border-border/60 hover:border-accent/40 transition-all">
              <CardContent className="p-5 flex items-center gap-5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <doc.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{doc.name}</h3>
                    <Badge variant="outline" className={`text-[10px] ${
                      doc.status === "available" ? "border-emerald-500/30 text-emerald-500" :
                      doc.status === "on-request" ? "border-amber-500/30 text-amber-500" :
                      "border-violet-500/30 text-violet-500"
                    }`}>
                      {doc.status === "available" ? "Standard" : doc.status === "on-request" ? "On Request" : "Investors Only"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 px-2 gap-1 text-xs">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </Button>
                  {isSignedIn ? (
                    <Button size="sm" variant="outline" className="h-8 px-2 gap-1 text-xs">
                      <Download className="w-3.5 h-3.5" /> Download
                    </Button>
                  ) : (
                    <Link href="/sign-in">
                      <Button size="sm" variant="outline" className="h-8 px-2 gap-1 text-xs">
                        <Lock className="w-3.5 h-3.5" /> Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="container px-4 md:px-6 mt-12">
          <Card className="border-accent/20 bg-accent/5 max-w-2xl mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
              <h3 className="text-xl font-heading font-bold">Need Documents for a Specific Shipment?</h3>
              <p className="text-muted-foreground text-sm">Contact our trade documentation team. We prepare and certify all documents within 48 hours of cargo loading.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href="mailto:docs@ogexports.co">
                  <Button variant="outline" size="sm">docs@ogexports.co</Button>
                </a>
                <a href="https://wa.me/923032569000" target="_blank" rel="noopener noreferrer">
                  <Button size="sm">WhatsApp +92 303 256 9000</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
