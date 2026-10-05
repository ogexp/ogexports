import { Ship, ArrowRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "wouter"

export default function Freight() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-card border-b border-border pt-32 pb-16">
        <div className="container px-4 md:px-6 text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Freight & Logistics
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">
             Request a Shipment-Specific<br className="hidden md:block" /> Freight Quote
          </h1>
          <p className="text-lg text-muted-foreground">
            Carrier availability, rates, and transit estimates depend on the route, cargo, and current bookings. This page does not publish live carrier prices or ETAs.
          </p>
          <Link href="/contact">
            <Button size="lg" className="gap-2 mt-2">Request Freight Quote <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="container px-4 md:px-6 max-w-3xl">
          <Card className="border-border/60">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-heading font-bold">Details needed for a current quote</h2>
                  <p className="text-muted-foreground">
                    Share the origin, destination, cargo, quantity, packaging, Incoterm, and requested shipment date. The export team can confirm available options and current terms for that shipment.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact">
                  <Button className="gap-2">Request a Freight Quote <ArrowRight className="w-4 h-4" /></Button>
                </Link>
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Ship className="w-4 h-4" />
                  Rates and timing are confirmed per shipment.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
