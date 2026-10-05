import React, { useEffect, useRef, useState } from "react"

const MILESTONES = [
  {
    year: "2019",
    title: "Company Founded",
    desc: "OG Exports (Pvt) Ltd established in Karachi. Initial focus on domestic rice trading with plans for international expansion.",
    icon: "🏢",
    accent: "hsl(158 59% 15%)",
  },
  {
    year: "2020",
    title: "First Export Shipment",
    desc: "Successfully completed first international export — 2 containers of Super Basmati Rice to UAE. Secured phytosanitary and PSQCA certifications.",
    icon: "🚢",
    accent: "hsl(38 41% 59%)",
  },
  {
    year: "2021",
    title: "Middle East Expansion",
    desc: "Established verified buyer relationships across UAE, Saudi Arabia, Qatar, Kuwait, and Oman. Monthly shipment volume crossed 50 MT.",
    icon: "🌍",
    accent: "hsl(158 59% 15%)",
  },
  {
    year: "2022",
    title: "Product Portfolio Growth",
    desc: "Expanded to 6 core commodity categories: Rice, Sesame Seeds, Yellow Corn, Fresh Mangoes, Frozen IQF Produce, and Specialty Spices.",
    icon: "📦",
    accent: "hsl(38 41% 59%)",
  },
  {
    year: "2023",
    title: "European Market Entry",
    desc: "Secured EU import-compliant certifications (BRC Grade A, FSSC 22000, ISO 22000). First EU-destined shipments to UK, Netherlands, and Germany.",
    icon: "🇪🇺",
    accent: "hsl(158 59% 15%)",
  },
  {
    year: "2024",
    title: "Digital Platform Launch",
    desc: "Launched the B2B trade platform for online RFQs, investor records, and shipment milestones recorded in the portal.",
    icon: "💻",
    accent: "hsl(38 41% 59%)",
  },
  {
    year: "2025",
    title: "International Trade",
    desc: "Expanded agricultural trade operations and developed buyer relationships across international markets.",
    icon: "🏆",
    accent: "hsl(158 59% 15%)",
  },
  {
    year: "2026",
    title: "Investment Platform",
    desc: "Opened containerized investment opportunities with project-level terms and documents available through the investor portal. Returns are not guaranteed.",
    icon: "📈",
    accent: "hsl(38 41% 59%)",
  },
]

function MilestoneCard({ milestone, index, isLast }: { milestone: typeof MILESTONES[0]; index: number; isLast: boolean }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isLeft = index % 2 === 0

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`grid grid-cols-[1fr_auto_1fr] gap-8 items-center transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Left slot */}
      <div className={isLeft ? "text-right" : ""}>
        {isLeft ? (
          <div
            className="inline-block p-6 rounded-2xl border shadow-sm ml-auto text-left max-w-xs"
            style={{
              background: "white",
              borderColor: `${milestone.accent}30`,
              borderLeft: `3px solid ${milestone.accent}`,
            }}
          >
            <div className="text-2xl mb-3">{milestone.icon}</div>
            <div className="font-heading font-bold text-lg mb-1.5" style={{ color: "hsl(207 24% 16%)" }}>
              {milestone.title}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>{milestone.desc}</p>
          </div>
        ) : null}
      </div>

      {/* Centre: timeline dot + year */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-heading font-bold text-xs shadow-lg border-4 border-white"
          style={{ background: milestone.accent }}
        >
          {milestone.year.slice(2)}
        </div>
        {!isLast && (
          <div className="w-[2px] h-16 rounded-full" style={{ background: `${milestone.accent}30` }} />
        )}
      </div>

      {/* Right slot */}
      <div>
        {!isLeft ? (
          <div
            className="inline-block p-6 rounded-2xl border shadow-sm max-w-xs"
            style={{
              background: "white",
              borderColor: `${milestone.accent}30`,
              borderRight: `3px solid ${milestone.accent}`,
            }}
          >
            <div className="text-2xl mb-3">{milestone.icon}</div>
            <div className="font-heading font-bold text-lg mb-1.5" style={{ color: "hsl(207 24% 16%)" }}>
              {milestone.title}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>{milestone.desc}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function LuxuryMilestones() {
  return (
    <section
      className="py-24 lg:py-32 relative overflow-hidden"
      style={{ background: "hsl(60 17% 96%)" }}
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 50%, hsl(158 59% 15% / 0.025) 0%, transparent 70%)",
        }}
      />

      <div className="container px-4 md:px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="badge-green mx-auto w-fit">Our Journey</div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
            style={{ color: "hsl(207 24% 16%)" }}
          >
            Built Over
            <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
              5 Years of Excellence
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(38 41% 59%)" }} />
          <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>
            From a Karachi startup to an international agricultural trade platform —
            every milestone grounded in quality, compliance, and the trust of our partners.
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto space-y-0">
          {MILESTONES.map((m, i) => (
            <MilestoneCard key={m.year} milestone={m} index={i} isLast={i === MILESTONES.length - 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
