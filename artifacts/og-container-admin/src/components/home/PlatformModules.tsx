import React from "react";
import { Link } from "wouter";
import { 
  Package, TrendingUp, ShieldCheck, BarChart3,
  FileText, Leaf, Fingerprint, ArrowRight, Ship
} from "lucide-react";

const MODULES = [
  {
    icon: Package,
    title: "Product Catalog",
    desc: "Browse 30+ premium agricultural commodities with full specifications, lab reports, and FOB pricing.",
    link: "/products",
    accent: "gold",
  },
  {
    icon: Leaf,
    title: "Export Products",
    desc: "Basmati Rice, Yellow Corn, Sesame Seeds, IQF Potatoes, Fresh Mangoes and more — direct from Punjab farms.",
    link: "/products",
    accent: "green",
  },
  {
    icon: TrendingUp,
    title: "Containerised Investment",
    desc: "Co-fund active export shipments and earn fixed profit-sharing returns on physical commodity trades.",
    link: "/invest",
    accent: "gold",
  },
  {
    icon: Ship,
    title: "Long-Term Projects",
    desc: "Invest in Fresh F&V Market operations and our Potato Processing Plant for institutional-grade annual returns.",
    link: "/invest",
    accent: "green",
  },
  {
    icon: BarChart3,
    title: "Market Intelligence",
    desc: "Live commodity prices, global trade data, and OG Exports market reports for informed decisions.",
    link: "/market-intelligence",
    accent: "gold",
  },
  {
    icon: FileText,
    title: "Export Documentation",
    desc: "Commercial invoices, phytosanitary certificates, COAs, and full trade document packages for every shipment.",
    link: "/export-terms",
    accent: "green",
  },
  {
    icon: Fingerprint,
    title: "Investor KYC",
    desc: "Enterprise-grade identity and compliance verification for all investors and trade partners.",
    link: "/account",
    accent: "gold",
  },
  {
    icon: ShieldCheck,
    title: "Quality Assurance",
    desc: "Third-party laboratory testing on every lot before loading.",
    link: "/certifications",
    accent: "green",
  },
];

export function PlatformOverview() {
  return (
    <section className="py-24 lg:py-32 bg-card relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[150px] pointer-events-none translate-x-1/3 -translate-y-1/3"
        style={{ background: "radial-gradient(ellipse, hsl(155 55% 40% / 0.08) 0%, transparent 70%)" }}
      />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none -translate-x-1/3 translate-y-1/3"
        style={{ background: "radial-gradient(ellipse, hsl(43 88% 52% / 0.07) 0%, transparent 70%)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="badge-green w-fit">Two Business Divisions</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">
            Import, Export &amp; Investment — All Under One Roof.
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            OG Exports operates two focused divisions: a world-class agricultural import &amp; export business and a transparent investment platform open to global investors.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODULES.map((mod, i) => {
            const isGold = mod.accent === "gold"
            return (
              <Link key={i} href={mod.link}>
                <div className="group h-full cursor-pointer rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                  style={{ background: "hsl(var(--background) / 0.5)", borderColor: "hsl(var(--border))" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = isGold
                      ? "hsl(43 88% 52% / 0.40)"
                      : "hsl(155 55% 40% / 0.40)"
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))"
                  }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: isGold ? "hsl(43 88% 52% / 0.10)" : "hsl(155 55% 40% / 0.10)",
                      border: `1px solid ${isGold ? "hsl(43 88% 52% / 0.22)" : "hsl(155 55% 40% / 0.22)"}`,
                    }}
                  >
                    <mod.icon
                      className="w-5 h-5 transition-colors duration-300"
                      style={{ color: isGold ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
                    />
                  </div>
                  <h3 className="text-lg font-heading font-semibold mb-2 text-foreground transition-colors duration-200 group-hover:text-accent">
                    {mod.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-5 text-sm">
                    {mod.desc}
                  </p>
                  <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wider transition-colors duration-200 text-muted-foreground group-hover:text-accent">
                    Learn More <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  );
}
