import { Ship, Clock, DollarSign, MapPin, ArrowRight, CheckCircle2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"

const FREIGHT_FORWARDERS = [
  { id: 1, name: "Maersk Line", type: "Ocean Freight", route: "Pakistan → UAE / Saudi Arabia", transitTime: "10–14 days", priceRange: "$800–$1,200 / FCL", rating: 4.9, featured: true },
  { id: 2, name: "MSC Mediterranean", type: "Ocean Freight", route: "Pakistan → Europe (Rotterdam / Hamburg)", transitTime: "18–24 days", priceRange: "$1,200–$1,800 / FCL", rating: 4.7, featured: true },
  { id: 3, name: "COSCO Shipping", type: "Ocean Freight", route: "Pakistan → China / Southeast Asia", transitTime: "12–18 days", priceRange: "$900–$1,400 / FCL", rating: 4.6, featured: false },
  { id: 4, name: "Hapag-Lloyd", type: "Ocean Freight", route: "Pakistan → East Africa (Mombasa / Dar es Salaam)", transitTime: "16–22 days", priceRange: "$1,000–$1,600 / FCL", rating: 4.5, featured: false },
  { id: 5, name: "Emirates SkyCargo", type: "Air Freight", route: "Pakistan → UAE / Europe / USA", transitTime: "1–3 days", priceRange: "$3.50–$6.00 / kg", rating: 4.8, featured: false },
]

export default function Freight() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-card border-b border-border pt-32 pb-16">
        <div className="container px-4 md:px-6 text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Freight & Logistics
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">
            Compare Freight Forwarders<br className="hidden md:block" /> for Pakistan Exports
          </h1>
          <p className="text-lg text-muted-foreground">
            Get competitive quotes from verified shipping lines and freight forwarders. Ocean and air freight from Port Qasim and Karachi.
          </p>
          <Link href="/contact">
            <Button size="lg" className="gap-2 mt-2">Request Freight Quote <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </section>

      <div className="bg-primary/5 border-b border-border">
        <div className="container px-4 md:px-6 py-4 flex flex-wrap justify-center gap-8 text-center text-sm">
          {[["40+", "Destination Ports"], ["12+", "Shipping Lines"], ["500+", "Containers/Year"], ["98%", "On-Time Delivery"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-xl font-heading font-bold text-accent">{val}</div>
              <div className="text-muted-foreground text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="py-16">
        <div className="container px-4 md:px-6 space-y-6">
          <h2 className="text-2xl font-heading font-bold">Available Freight Options</h2>
          {FREIGHT_FORWARDERS.map(f => (
            <Card key={f.id} className={`border-border/60 hover:border-accent/40 transition-all ${f.featured ? "border-accent/30 bg-accent/5" : ""}`}>
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  {f.type === "Air Freight" ? <Package className="w-6 h-6 text-primary" /> : <Ship className="w-6 h-6 text-primary" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-semibold">{f.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                    {f.featured && <Badge className="text-[10px] bg-accent/10 text-accent border-accent/20">Preferred Partner</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {f.route}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4 text-accent" />
                    <span>{f.transitTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <span>{f.priceRange}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold">{f.rating}</span>
                  </div>
                </div>
                <Button size="sm" className="shrink-0">Get Quote</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
