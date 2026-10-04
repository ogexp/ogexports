import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, MapPin, TrendingUp, Users, Package } from "lucide-react";
import { getSiteSettings } from "@/lib/cms-data";

function parseStatStr(s: string): { value: number; suffix: string } {
  const m = s.match(/^(\d+)(.*)/);
  return m ? { value: parseInt(m[1], 10), suffix: m[2] } : { value: 0, suffix: "" };
}

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const steps = 60;
        const inc = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += inc;
          if (current >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
}

export function LuxuryAbout() {
  const cms = getSiteSettings()
  const STATS = [
    { ...parseStatStr(cms.stats.years), label: "Years of Excellence", icon: TrendingUp },
    { ...parseStatStr(cms.stats.countries), label: "Countries Served", icon: MapPin },
    { ...parseStatStr(cms.stats.commodities), label: "Products Exported", icon: Package },
    { ...parseStatStr(cms.stats.buyers), label: "Active Buyers", icon: Users },
  ]

  return (
    <>
      {/* ── Stats Strip ── */}
      <section
        className="relative py-0 overflow-hidden"
        style={{ background: "hsl(158 59% 15%)" }}
      >
        {/* Gold top line */}
        <div
          className="absolute top-0 inset-x-0 h-[1px]"
          style={{ background: "linear-gradient(to right, transparent, hsl(38 41% 59% / 0.5) 30%, hsl(38 41% 59% / 0.5) 70%, transparent)" }}
        />

        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center py-12 px-6 text-center relative"
                style={{
                  borderRight: i < 3 ? "1px solid hsl(0 0% 100% / 0.10)" : "none",
                }}
              >
                <div
                  className="text-5xl md:text-6xl font-heading font-bold mb-2"
                  style={{ color: i % 2 === 0 ? "hsl(38 41% 70%)" : "white" }}
                >
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-white/55 text-sm uppercase tracking-widest font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gold bottom line */}
        <div
          className="absolute bottom-0 inset-x-0 h-[1px]"
          style={{ background: "linear-gradient(to right, transparent, hsl(38 41% 59% / 0.5) 30%, hsl(38 41% 59% / 0.5) 70%, transparent)" }}
        />
      </section>

      {/* ── About Section ── */}
      <section
        className="py-28 lg:py-36 relative overflow-hidden"
        style={{ background: "hsl(60 17% 96%)" }}
      >
        {/* Subtle ambient */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, hsl(158 59% 15% / 0.04) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />

        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left: Text */}
            <div className="space-y-8">
              <div>
                <div className="badge-green mb-5">About OG Exports</div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1] mb-6"
                  style={{ color: "hsl(207 24% 16%)" }}
                >
                  Pakistan's Premier
                  <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
                    Agricultural Trade House
                  </span>
                </h2>
                <div className="w-16 h-[3px] rounded-full mb-8"
                  style={{ background: "hsl(38 41% 59%)" }}
                />
              </div>

              <div className="space-y-5 text-lg leading-relaxed" style={{ color: "hsl(207 16% 38%)" }}>
                <p>
                  OG Exports (Private) Limited is a Pakistan-based agricultural trade company with over
                  5+ years of operational excellence. We operate at the intersection of Pakistan's
                  world-class agricultural belt and the world's most demanding commodity markets.
                </p>
                <p>
                  Our direct sourcing relationships with thousands of farmers across Punjab and Sindh
                  allow us to deliver premium-grade produce — from Super Basmati Rice and Fresh Mangoes
                  to Sesame Seeds and Yellow Corn — with full traceability, laboratory certifications,
                  and institutional documentation standards.
                </p>
                <p>
                  SECP-registered and export-licensed, compliant with international trade standards for our
                  investment platform, we serve verified buyers, importers, distributors, and investors
                  across 40+ countries on every continent.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/about">
                  <button
                    className="inline-flex items-center gap-2.5 h-13 px-8 py-4 rounded-full font-heading font-semibold text-sm transition-all duration-300 group"
                    style={{
                      background: "hsl(158 59% 15%)",
                      color: "white",
                      boxShadow: "0 4px 20px hsl(158 59% 15% / 0.3)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px hsl(158 59% 15% / 0.5)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px hsl(158 59% 15% / 0.3)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    Our Story
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/contact">
                  <button
                    className="inline-flex items-center gap-2.5 h-13 px-8 py-4 rounded-full font-heading font-semibold text-sm transition-all duration-300 border"
                    style={{
                      background: "transparent",
                      color: "hsl(158 59% 15%)",
                      borderColor: "hsl(158 59% 15% / 0.35)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15% / 0.06)";
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(158 59% 15%)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(158 59% 15% / 0.35)";
                    }}
                  >
                    Get In Touch
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative">
              {/* Main card */}
              <div
                className="rounded-3xl overflow-hidden relative"
                style={{
                  background: "hsl(158 59% 15%)",
                  padding: "2px",
                }}
              >
                <div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: "linear-gradient(135deg, hsl(38 41% 59% / 0.4), hsl(158 59% 15% / 0.1) 40%, hsl(38 41% 59% / 0.2))",
                  }}
                />
                <div
                  className="relative rounded-3xl p-10"
                  style={{ background: "hsl(158 59% 13%)" }}
                >
                  {/* Grid of highlights */}
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { title: "Direct Sourcing", desc: "Farm-to-port supply chain with full traceability across Punjab & Sindh", icon: "🌾" },
                      { title: "Global Reach", desc: "UAE, UK, Europe, SE Asia, Africa & beyond — 40+ verified markets", icon: "🌍" },
                      { title: "Lab Certified", desc: "PCSIR-accredited testing on every lot for moisture, purity & compliance", icon: "🔬" },
                      { title: "Full Documentation", desc: "COA, Phytosanitary, Fumigation, Commercial Invoice — all in-house", icon: "📋" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
                        style={{
                          background: "hsl(0 0% 100% / 0.04)",
                          borderColor: "hsl(0 0% 100% / 0.08)",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59% / 0.30)";
                          (e.currentTarget as HTMLElement).style.background = "hsl(38 41% 59% / 0.06)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.08)";
                          (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.04)";
                        }}
                      >
                        <div className="text-2xl mb-3">{item.icon}</div>
                        <div className="font-heading font-semibold text-white text-sm mb-2">{item.title}</div>
                        <div className="text-white/45 text-xs leading-relaxed">{item.desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom badge row */}
                  <div
                    className="mt-6 pt-6 flex flex-wrap gap-3"
                    style={{ borderTop: "1px solid hsl(0 0% 100% / 0.08)" }}
                  >
                    {["SECP Registered", "Export Licensed", "Quality Assured", "Lab Tested"].map((cert, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
                        style={{
                          background: "hsl(38 41% 59% / 0.14)",
                          border: "1px solid hsl(38 41% 59% / 0.30)",
                          color: "hsl(38 55% 72%)",
                        }}
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating dot */}
              <div
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(38 41% 59% / 0.35) 0%, transparent 70%)",
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
