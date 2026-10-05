import React from "react";
import { Link } from "wouter";
import { ArrowRight, Ship, Package, FileText, MapPin, Clock, Shield } from "lucide-react";

const FREIGHT_SERVICES = [
  {
    icon: Ship,
    title: "Sea Freight (FCL/LCL)",
    desc: "Full container load and less-than-container-load shipments from Port Qasim and Karachi Port to all major global destinations.",
  },
  {
    icon: Package,
    title: "Air Freight",
    desc: "Express air cargo for time-sensitive perishables, samples, and urgent consignments via Karachi and Islamabad international airports.",
  },
  {
    icon: FileText,
    title: "Customs Brokerage",
    desc: "Complete export customs clearance, filing of GDs, coordination with FBR, and all port formalities handled by our licensed brokers.",
  },
  {
    icon: Shield,
    title: "Cargo Insurance",
    desc: "Comprehensive marine cargo insurance on all shipments. Institute Cargo Clause (A) coverage available with full-value protection.",
  },
  {
    icon: MapPin,
    title: "Recorded Shipment Updates",
    desc: "Review shipment milestones recorded in your account. Live carrier locations and live ETAs are not provided here.",
  },
  {
    icon: Clock,
    title: "Expedited Processing",
    desc: "Priority processing for urgent orders with fast-track documentation preparation and dedicated port coordination.",
  },
];

const INCOTERMS = ["FOB", "CIF", "CFR", "EXW"];

export function LuxuryFreight() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(60 17% 96%)" }}
    >
      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-20 items-start">
          {/* Left: Text + Incoterms */}
          <div className="space-y-8">
            <div>
              <div className="badge-gold mb-5">Freight Forwarding Services</div>
              <h2
                className="text-4xl md:text-5xl font-heading font-bold leading-[1.1] mb-5"
                style={{ color: "hsl(207 24% 16%)" }}
              >
                End-to-End
                <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
                  Logistics Management
                </span>
              </h2>
              <div className="w-16 h-[3px] rounded-full mb-6" style={{ background: "hsl(43 85% 47%)" }} />
              <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 42%)" }}>
                OG Exports manages the complete logistics lifecycle — from warehouse pickup
                to destination port delivery. Our in-house freight team handles all aspects
                of international cargo movement, ensuring zero surprises.
              </p>
            </div>

            {/* Incoterms */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "hsl(207 16% 55%)" }}>
                Supported Incoterms
              </div>
              <div className="flex flex-wrap gap-2">
                {INCOTERMS.map((term, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 rounded-full font-heading font-bold text-sm transition-all duration-300 cursor-default border"
                    style={{
                      background: "white",
                      borderColor: "hsl(158 59% 15% / 0.22)",
                      color: "hsl(158 59% 15%)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15%)";
                      (e.currentTarget as HTMLElement).style.color = "white";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "white";
                      (e.currentTarget as HTMLElement).style.color = "hsl(158 59% 15%)";
                    }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>

            {/* Ports */}
            <div
              className="p-6 rounded-2xl border"
              style={{
                background: "white",
                borderColor: "hsl(60 10% 88%)",
              }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "hsl(207 16% 55%)" }}>
                Primary Export Ports
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Port Qasim", desc: "Primary container port — Karachi" },
                  { name: "Karachi Port", desc: "Historical port — city centre" },
                  { name: "KICT Terminal", desc: "International container hub" },
                  { name: "Air Freight", desc: "JIAP & Islamabad International" },
                ].map((port, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(43 85% 47%)" }} />
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "hsl(207 24% 20%)" }}>{port.name}</div>
                      <div className="text-xs" style={{ color: "hsl(207 16% 55%)" }}>{port.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/contact">
              <button
                className="inline-flex items-center gap-2.5 h-13 px-8 py-4 rounded-full font-heading font-semibold text-sm transition-all duration-300"
                style={{
                  background: "hsl(158 59% 15%)",
                  color: "white",
                  boxShadow: "0 4px 20px hsl(158 59% 15% / 0.30)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px hsl(158 59% 15% / 0.50)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(158 59% 15% / 0.30)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                Freight Services Overview <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* Right: Service Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FREIGHT_SERVICES.map((service, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border transition-all duration-300 group cursor-default"
                style={{
                  background: "white",
                  borderColor: "hsl(60 10% 88%)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(158 59% 15% / 0.25)";
                  (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15% / 0.03)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(0 0% 0% / 0.06)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                  (e.currentTarget as HTMLElement).style.background = "white";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{
                    background: "hsl(158 59% 15% / 0.08)",
                    border: "1px solid hsl(158 59% 15% / 0.18)",
                  }}
                >
                  <service.icon className="w-4.5 h-4.5" style={{ color: "hsl(158 59% 15%)" }} />
                </div>
                <h3
                  className="font-heading font-bold text-sm mb-2"
                  style={{ color: "hsl(207 24% 16%)" }}
                >
                  {service.title}
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "hsl(207 16% 48%)" }}
                >
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
