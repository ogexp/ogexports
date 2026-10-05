import React from "react";

const REGIONS = [
  {
    region: "Middle East & Gulf",
    countries: ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain"],
    commodities: ["Basmati Rice", "Fresh Mangoes", "Sesame Seeds", "Frozen Vegetables"],
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.08)",
    border: "hsl(43 85% 47% / 0.25)",
  },
  {
    region: "Europe & United Kingdom",
    countries: ["UK", "Netherlands", "Germany", "France", "Spain", "Belgium"],
    commodities: ["Organic Basmati", "Sesame", "Yellow Corn", "Specialty Grains"],
    color: "hsl(158 59% 20%)",
    bg: "hsl(158 59% 15% / 0.06)",
    border: "hsl(158 59% 15% / 0.22)",
  },
  {
    region: "Southeast Asia & Pacific",
    countries: ["Malaysia", "Singapore", "Indonesia", "Philippines", "Australia"],
    commodities: ["Yellow Corn", "Rice", "Chickpeas", "Dried Fruits"],
    color: "hsl(123 38% 42%)",
    bg: "hsl(123 38% 42% / 0.06)",
    border: "hsl(123 38% 42% / 0.20)",
  },
  {
    region: "Africa",
    countries: ["Kenya", "Nigeria", "Egypt", "Ethiopia", "Tanzania", "Ghana"],
    commodities: ["Yellow Corn", "Wheat", "Rice", "Chickpeas"],
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.06)",
    border: "hsl(43 85% 47% / 0.20)",
  },
  {
    region: "North America",
    countries: ["USA", "Canada"],
    commodities: ["Basmati Rice", "Organic Grains", "Specialty Spices"],
    color: "hsl(158 59% 20%)",
    bg: "hsl(158 59% 15% / 0.05)",
    border: "hsl(158 59% 15% / 0.18)",
  },
];

export function LuxuryGlobalMarkets() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(60 17% 96%)" }}
    >
      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="badge-green mx-auto w-fit">Global Markets</div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
            style={{ color: "hsl(207 24% 16%)" }}
          >
            Reaching Every Corner
            <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
              of the World
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(43 85% 47%)" }} />
          <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>
            Explore example destinations and commodity categories. Confirm active routes and
            availability against current order or project records.
          </p>
        </div>

        {/* Regions */}
        <div className="space-y-4">
          {REGIONS.map((region, i) => (
            <div
              key={i}
              className="group p-6 md:p-8 rounded-3xl border transition-all duration-300"
              style={{
                background: "white",
                borderColor: "hsl(60 10% 88%)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = region.bg;
                (e.currentTarget as HTMLElement).style.borderColor = region.border;
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(0 0% 0% / 0.06)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "white";
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Region Info */}
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-heading font-bold" style={{ color: "hsl(207 24% 16%)" }}>
                    {region.region}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {region.countries.map((c, j) => (
                      <span
                        key={j}
                        className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{
                          background: `${region.color}14`,
                          border: `1px solid ${region.color}28`,
                          color: region.color,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Commodities */}
                <div className="md:text-right shrink-0 max-w-xs">
                  <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: "hsl(207 16% 58%)" }}>
                    Key Commodities
                  </div>
                  <div className="text-sm" style={{ color: "hsl(207 24% 30%)" }}>
                    {region.commodities.join(" · ")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
