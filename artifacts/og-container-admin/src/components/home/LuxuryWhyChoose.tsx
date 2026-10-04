import React from "react";
import {
  ShieldCheck, Globe, Leaf, TrendingUp, Clock, Award,
  Microscope, FileText, Ship, BarChart3, Users, Zap
} from "lucide-react";

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Institutional Quality Standards",
    desc: "Every consignment is tested at PCSIR-accredited laboratories. We deliver COA, Phytosanitary, Fumigation Certificates, and full compliance documentation — no exceptions.",
    color: "hsl(158 59% 15%)",
    bg: "hsl(158 59% 15% / 0.06)",
    border: "hsl(158 59% 15% / 0.18)",
  },
  {
    icon: Globe,
    title: "40+ Country Global Network",
    desc: "Established trade relationships with verified importers, distributors, and buyers across UAE, UK, EU, Southeast Asia, Africa, and the Americas.",
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.06)",
    border: "hsl(43 85% 47% / 0.20)",
  },
  {
    icon: Leaf,
    title: "Direct Farm Sourcing",
    desc: "We procure directly from agricultural communities in Punjab and Sindh — eliminating middlemen, ensuring freshness, and securing competitive pricing for buyers.",
    color: "hsl(123 38% 42%)",
    bg: "hsl(123 38% 42% / 0.06)",
    border: "hsl(123 38% 42% / 0.18)",
  },
  {
    icon: FileText,
    title: "Complete Export Documentation",
    desc: "LC-compliant commercial invoices, packing lists, certificates of origin, and all trade documents prepared in-house by our experienced operations team.",
    color: "hsl(158 59% 15%)",
    bg: "hsl(158 59% 15% / 0.06)",
    border: "hsl(158 59% 15% / 0.18)",
  },
  {
    icon: Ship,
    title: "End-to-End Logistics",
    desc: "Port Qasim to any destination worldwide. We handle customs clearance, sea freight booking, cargo insurance, and real-time shipment tracking.",
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.06)",
    border: "hsl(43 85% 47% / 0.20)",
  },
  {
    icon: TrendingUp,
    title: "Transparent Investment Platform",
    desc: "SECP-registered investment vehicles with full financial transparency. Three distinct opportunities with clear risk profiles and documented return structures.",
    color: "hsl(123 38% 42%)",
    bg: "hsl(123 38% 42% / 0.06)",
    border: "hsl(123 38% 42% / 0.18)",
  },
  {
    icon: Clock,
    title: "5+ Years Track Record",
    desc: "A proven operational history across multiple commodity cycles, international market shifts, and regulatory changes — with consistent delivery performance.",
    color: "hsl(158 59% 15%)",
    bg: "hsl(158 59% 15% / 0.06)",
    border: "hsl(158 59% 15% / 0.18)",
  },
  {
    icon: Award,
    title: "Premium Certifications",
    desc: "SECP Registered · Export Licensed · Quality Assured · Lab Tested. Internationally recognized quality management systems at every level of the supply chain.",
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.06)",
    border: "hsl(43 85% 47% / 0.20)",
  },
  {
    icon: Users,
    title: "Dedicated Trade Managers",
    desc: "Every buyer and investor is assigned a dedicated relationship manager — available across time zones for inquiries, updates, and customized solutions.",
    color: "hsl(123 38% 42%)",
    bg: "hsl(123 38% 42% / 0.06)",
    border: "hsl(123 38% 42% / 0.18)",
  },
];

export function LuxuryWhyChoose() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(60 17% 96%)" }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(hsl(158 59% 15%) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="badge-green mx-auto w-fit">Why Choose OG Exports</div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
            style={{ color: "hsl(207 24% 16%)" }}
          >
            The Standard of
            <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
              Agricultural Trade Excellence
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(43 85% 47%)" }} />
          <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>
            Nine reasons why Fortune 500 importers, institutional investors, and global
            distributors trust OG Exports as their long-term trade partner.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REASONS.map((reason, i) => (
            <div
              key={i}
              className="group p-8 rounded-3xl border transition-all duration-350 cursor-default"
              style={{
                background: "white",
                borderColor: "hsl(60 10% 88%)",
                boxShadow: "0 2px 10px hsl(0 0% 0% / 0.04)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = reason.border;
                (e.currentTarget as HTMLElement).style.background = reason.bg;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px hsl(0 0% 0% / 0.08)`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                (e.currentTarget as HTMLElement).style.background = "white";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px hsl(0 0% 0% / 0.04)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Number */}
              <div
                className="text-xs font-black tracking-widest uppercase mb-4"
                style={{ color: "hsl(60 10% 80%)" }}
              >
                0{i + 1}
              </div>

              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
                style={{ background: reason.bg, border: `1px solid ${reason.border}` }}
              >
                <reason.icon className="w-5 h-5" style={{ color: reason.color }} />
              </div>

              {/* Content */}
              <h3
                className="text-lg font-heading font-bold mb-3 leading-snug"
                style={{ color: "hsl(207 24% 16%)" }}
              >
                {reason.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "hsl(207 16% 46%)" }}
              >
                {reason.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
