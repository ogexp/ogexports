import { Award, Globe, ShieldCheck, Target, Leaf, Ship, FileCheck, Anchor, MapPin, Building2 } from "lucide-react"
import { usePageTitle } from "@/hooks/use-page-title"

export default function About() {
  usePageTitle("About Us", "Learn about OG Exports — Pakistan's premier B2B agricultural trading company with 5+ years of excellence, exporting to 40+ countries across the Middle East, Europe, Africa, and Asia.")
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative py-32 md:py-48 overflow-hidden bg-black border-b border-border">
        <div className="absolute inset-0 z-0">
          <img src={`${import.meta.env.BASE_URL}images/about-hero.jpg`} alt="Punjab rice fields" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="container px-4 md:px-6 relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Corporate Profile
          </div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold tracking-tight text-white drop-shadow-xl">
            Rooted in Punjab. <br className="hidden md:block"/>Built for the World.
          </h1>
          <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto drop-shadow-md">
            OG Exports (Private) Limited exists to connect Pakistan's rich agricultural heartland directly with multi-million dollar global commodity markets. Certainty, compliance, and scale.
          </p>
        </div>
      </section>

      {/* Story & Vision */}
      <section className="py-24">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Our Heritage</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Founded with a clear mission: to elevate Pakistani agricultural exports to enterprise standards. Based in Depalpur City, Punjab — the heart of Pakistan's fertile rice and wheat belt — we have direct access to the source. From premium Basmati rice to export-grade fresh mangoes, we control the supply chain from soil to port.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <MapPin className="w-5 h-5 text-accent" /> Depalpur City, Punjab
                  </div>
                  <p className="text-sm text-muted-foreground">Strategic procurement from Pakistan's most fertile agricultural zones.</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Anchor className="w-5 h-5 text-accent" /> Port Qasim Access
                  </div>
                  <p className="text-sm text-muted-foreground">Direct rail and road links to major sea ports for rapid global dispatch.</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden relative z-10 border border-border">
                <img src={`${import.meta.env.BASE_URL}images/shipping-port.jpg`} className="w-full h-full object-cover" alt="Port Qasim Loading" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                  <div className="text-white">
                    <div className="font-heading text-2xl font-bold mb-2">Global Logistics</div>
                    <div className="text-white/80 text-sm">Direct loading at Port Qasim, Karachi.</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-8 -left-8 glass-panel p-6 rounded-2xl bg-card border-border border shadow-2xl z-20 max-w-[240px]">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mb-4" />
                <h3 className="font-heading font-semibold text-lg mb-2">Export Certified</h3>
                <p className="text-sm text-muted-foreground">Fully registered with SECP and export-licensed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications Strip */}
      <section className="py-12 bg-card border-y border-border">
        <div className="container px-4 md:px-6">
          <p className="text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-8">Official Credentials & Registrations</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {["SECP Registration", "NTN Certificate", "Export License", "Chamber of Commerce", "Phytosanitary Certificate"].map((cert, i) => (
              <div key={i} className="flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-lg">
                <FileCheck className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Network Map / Data */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-16">Global Export Network</h2>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-16">
            <div className="space-y-2">
              <div className="text-5xl font-heading font-bold text-accent">5+</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Years Active</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-heading font-bold">40+</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Countries Served</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-heading font-bold">30+</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Products Exported</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-heading font-bold">98%</div>
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Client Satisfaction</div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 md:p-12 text-left">
            <h3 className="font-heading font-semibold text-2xl mb-8 border-b border-border pb-4">Key Export Markets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { region: "Middle East", list: ["UAE", "Saudi Arabia", "Kuwait", "Qatar", "Oman", "Bahrain"] },
                { region: "Asia", list: ["China", "Malaysia", "Indonesia", "Sri Lanka", "Bangladesh"] },
                { region: "Africa", list: ["Nigeria", "Kenya", "Tanzania", "Egypt"] },
                { region: "Europe", list: ["United Kingdom", "Germany", "Netherlands", "Spain"] },
              ].map(({ region, list }) => (
                <div key={region}>
                  <h4 className="font-semibold text-accent mb-4">{region}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {list.map(c => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sourcing & Processing */}
      <section className="py-24 bg-card border-t border-border">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-heading font-bold">The OG Process</h2>
            <p className="text-xl text-muted-foreground">Rigorous quality control from soil to ship.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: Leaf, title: "Farm Selection" },
              { icon: Target, title: "Quality Grading" },
              { icon: ShieldCheck, title: "Lab Testing" },
              { icon: FileCheck, title: "Documentation" },
              { icon: Anchor, title: "Port Loading" },
              { icon: Globe, title: "Global Delivery" }
            ].map((step, i) => (
              <div key={i} className="relative bg-background p-6 rounded-xl border border-border text-center flex flex-col items-center justify-center gap-4 hover:border-accent transition-colors">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="font-semibold text-sm">{step.title}</div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-border text-xs flex items-center justify-center font-bold text-muted-foreground z-10 hidden lg:flex">
                  {i < 5 ? ">" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
