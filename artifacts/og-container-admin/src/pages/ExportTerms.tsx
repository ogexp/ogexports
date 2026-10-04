import { Shield, CreditCard, FileCheck, Anchor, Scale, SearchCheck, Calendar, Phone } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export default function ExportTerms() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <section className="bg-card border-b border-border py-16 md:py-24">
        <div className="container px-4 md:px-6 max-w-4xl text-center space-y-6 mx-auto">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Official Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">
            Export Terms & Trade Conditions
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Standard operating procedures, payment protocols, and compliance frameworks for international commodity trade with OG Exports (Private) Limited.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-6 max-w-4xl mx-auto space-y-12">
          
          {/* Section 1 - Payment Terms */}
          <div id="payment-terms" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-heading font-bold">1. Payment Terms</h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-6">
              <p className="text-muted-foreground">
                To ensure secure and transparent transactions, we accept the following internationally recognized payment methods for all export orders:
              </p>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="lc">
                  <AccordionTrigger className="text-lg font-semibold hover:text-accent">
                    Letter of Credit (LC)
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-base space-y-2">
                    <p>100% Irrevocable, Confirmed, and at Sight Letter of Credit from a top 50 prime international bank.</p>
                    <p>Ideal for new buyers and large-volume transactions. The LC must be opened within 5 working days of signing the Proforma Invoice.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="sblc">
                  <AccordionTrigger className="text-lg font-semibold hover:text-accent">
                    Standby Letter of Credit (SBLC)
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-base space-y-2">
                    <p>Accepted for continuous, long-term contractual shipments (annual contracts).</p>
                    <p>Provides a flexible safety net while allowing for rapid, continuous dispatch of goods on a regular schedule.</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tt">
                  <AccordionTrigger className="text-lg font-semibold hover:text-accent">
                    Telegraphic Transfer (TT)
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-base space-y-2">
                    <p>Standard terms: 30% advance payment upon signing of the Proforma Invoice.</p>
                    <p>Remaining 70% balance payable against scanned copies of shipping documents (Bill of Lading, Commercial Invoice, Packing List).</p>
                    <p>Original documents will be dispatched via DHL/FedEx immediately upon receipt of full payment.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          {/* Section 2 - Incoterms */}
          <div id="incoterms" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <Anchor className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-heading font-bold">2. Incoterms</h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">FOB (Free On Board)</h3>
                  <p className="text-sm text-muted-foreground">Buyer assumes responsibility for sea freight, insurance, and unloading. We handle all costs up to loading at Port Qasim/Karachi.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">CNF (Cost & Freight)</h3>
                  <p className="text-sm text-muted-foreground">We cover the cost of the goods and ocean freight to the destination port. Buyer handles insurance during transit.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg">CIF (Cost, Insurance, Freight)</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive coverage. We handle goods cost, ocean freight, and marine insurance to the destination port.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 - MOQs */}
          <div id="moq" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <Scale className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-heading font-bold">3. Minimum Order Quantities (MOQ)</h2>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-6 md:p-8 space-y-4">
                  <h3 className="font-bold text-lg">Rice & Grains</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex justify-between border-b border-border/50 pb-2"><span>Basmati & IRRI-6 Rice</span> <span className="font-medium text-foreground">1×20ft FCL (~18-25 MT)</span></li>
                    <li className="flex justify-between border-b border-border/50 pb-2"><span>Yellow Corn</span> <span className="font-medium text-foreground">1×40ft FCL (~25-28 MT)</span></li>
                    <li className="flex justify-between border-b border-border/50 pb-2"><span>Sesame Seeds</span> <span className="font-medium text-foreground">1 MT (LCL accepted)</span></li>
                  </ul>
                </div>
                <div className="p-6 md:p-8 space-y-4">
                  <h3 className="font-bold text-lg">Produce & Processed</h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex justify-between border-b border-border/50 pb-2"><span>Fresh Mangoes</span> <span className="font-medium text-foreground">Seasonal (Air/Sea dependent)</span></li>
                    <li className="flex justify-between border-b border-border/50 pb-2"><span>Fresh Vegetables</span> <span className="font-medium text-foreground">1×20ft FCL (Reefer)</span></li>
                    <li className="flex justify-between border-b border-border/50 pb-2"><span>IQF Potato Sticks</span> <span className="font-medium text-foreground">1×20ft FCL (Reefer)</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 - Documentation */}
          <div id="documentation" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <FileCheck className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-heading font-bold">4. Standard Documentation</h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <p className="text-muted-foreground mb-6">The following standard export documents are provided with every shipment. Additional specialized documents (e.g., SGS certification) can be arranged at the buyer's request and cost.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {["Commercial Invoice (3 originals)", "Packing List (3 originals)", "Full Set Bill of Lading (B/L)", "Certificate of Origin", "Phytosanitary Certificate", "Quality & Weight Certificate", "Fumigation Certificate"].map((doc) => (
                  <div key={doc} className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5, 6, 7 - Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <SearchCheck className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg">5. Quality & Compliance</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All commodities undergo strict third-party lab testing. We adhere to SPS standards and maintain compliance with EU and FDA regulations where applicable. SGS or equivalent pre-shipment inspections are welcomed.
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg">6. Sampling Policy</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Free samples (200–500g per product) are available for genuine buyers to verify quality. The buyer is responsible only for the international courier freight charges (DHL/FedEx).
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-lg">7. Lead Times</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Standard delivery lead time to port of loading is 7–21 days from the receipt of the workable payment instrument, depending on the product, processing requirements, and packaging.
              </p>
            </div>
          </div>

          {/* Section 8 - Contact CTA */}
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-8 md:p-12 text-center space-y-6 mt-12">
            <h2 className="text-3xl font-heading font-bold text-foreground">Ready to start trading?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our export specialists are available to discuss tailored contracts, custom packaging, and specific delivery requirements.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href="mailto:sales@ogexports.co">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white min-w-[200px]">
                  Request Formal Quote
                </Button>
              </a>
              <a href="https://wa.me/923032569000" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="min-w-[200px] gap-2 border-border hover:bg-accent/10 hover:text-accent">
                  <Phone className="w-4 h-4" /> WhatsApp Sales
                </Button>
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}