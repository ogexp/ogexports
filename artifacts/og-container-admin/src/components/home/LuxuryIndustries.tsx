import React from "react";
import {
  ShoppingCart, Building2, Utensils, Factory,
  Ship, Wheat, Beef, Cookie
} from "lucide-react";

const INDUSTRIES = [
  { icon: ShoppingCart, title: "Retail & Supermarkets",        desc: "Premium packaged commodities for international grocery chains and private-label retail programs.", markets: ["UAE", "UK", "EU", "US"] },
  { icon: Building2,   title: "Food Manufacturers",            desc: "Bulk industrial-grade ingredients for flour mills, rice processors, and packaged food producers.", markets: ["Malaysia", "Indonesia", "Egypt"] },
  { icon: Utensils,    title: "Food Service & HoReCa",         desc: "Restaurant-grade specialty rice, grains, and produce for hotels, caterers, and food service operators.", markets: ["UAE", "Saudi Arabia", "Qatar"] },
  { icon: Factory,     title: "Processing & Re-export",        desc: "Raw commodity inputs for secondary processing, value-added manufacturing, and re-export hubs.", markets: ["Singapore", "Netherlands", "UAE"] },
  { icon: Ship,        title: "Commodity Traders & Brokers",   desc: "Physical commodity supply for trading houses, brokerage firms, and commodity exchanges globally.", markets: ["Geneva", "Dubai", "Singapore"] },
  { icon: Wheat,       title: "Flour Mills & Grain Processors", desc: "High-volume wheat, corn, and grain supply to industrial milling operations and starch processors.", markets: ["Egypt", "Turkey", "Bangladesh"] },
  { icon: Beef,        title: "Animal Feed & Livestock",       desc: "Certified feed-grade maize, soybean meal, and oilseed cakes for poultry, dairy, and livestock producers.", markets: ["Pakistan", "GCC", "Africa"] },
  { icon: Cookie,      title: "Bakery & Confectionery",        desc: "Consistent-grade oils, sesame seeds, nuts, and specialty grains for bakeries and confectionery manufacturers.", markets: ["UK", "Germany", "France"] },
];

export function LuxuryIndustries() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "white" }}
    >
      {/* Gold top line */}
      <div
        className="absolute top-0 inset-x-0 h-[1px]"
        style={{ background: "linear-gradient(to right, transparent, hsl(38 41% 59% / 0.4) 30%, hsl(38 41% 59% / 0.4) 70%, transparent)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-16 items-end mb-20">
          <div className="space-y-5">
            <div className="badge-gold">Industries We Serve</div>
            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
              style={{ color: "hsl(207 24% 16%)" }}
            >
              Serving Every
              <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
                Major Industry Sector
              </span>
            </h2>
            <div className="w-16 h-[3px] rounded-full" style={{ background: "hsl(38 41% 59%)" }} />
          </div>
          <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>
            From retail giants and food manufacturers to commodity traders and government
            procurement agencies — OG Exports delivers tailored supply solutions to every
            major sector of the global food and agriculture economy.
          </p>
        </div>

        {/* Industries Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {INDUSTRIES.map((industry, i) => (
            <div
              key={i}
              className="group p-7 rounded-3xl border transition-all duration-300 cursor-default relative overflow-hidden"
              style={{
                background: "hsl(60 17% 97%)",
                borderColor: "hsl(60 10% 88%)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "hsl(158 59% 15%)";
                el.style.borderColor = "hsl(158 59% 15%)";
                el.style.transform = "translateY(-4px)";
                el.style.boxShadow = "0 12px 40px hsl(158 59% 15% / 0.25)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "hsl(60 17% 97%)";
                el.style.borderColor = "hsl(60 10% 88%)";
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "none";
              }}
            >
              {/* Icon container */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
                style={{
                  background: "hsl(158 59% 15% / 0.08)",
                  border: "1px solid hsl(158 59% 15% / 0.18)",
                }}
              >
                <industry.icon
                  className="w-5 h-5 transition-colors duration-300"
                  style={{ color: "hsl(158 59% 15%)" }}
                />
              </div>

              <h3
                className="font-heading font-bold text-base mb-3 transition-colors duration-300 leading-snug"
                style={{ color: "hsl(207 24% 16%)" }}
              >
                {industry.title}
              </h3>

              <p
                className="text-sm leading-relaxed mb-4 transition-colors duration-300"
                style={{ color: "hsl(207 16% 46%)" }}
              >
                {industry.desc}
              </p>

              {/* Market tags */}
              <div className="flex flex-wrap gap-1.5">
                {industry.markets.map((m, j) => (
                  <span
                    key={j}
                    className="text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wide transition-all duration-300"
                    style={{
                      background: "hsl(38 41% 59% / 0.12)",
                      border: "1px solid hsl(38 41% 59% / 0.22)",
                      color: "hsl(38 41% 42%)",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
