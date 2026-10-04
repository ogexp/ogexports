import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Globe, ShieldCheck, TrendingUp, Award } from "lucide-react";
import { Link } from "wouter";
import { InvestmentModuleOptional } from "@/components/auth/InvestmentModuleGate";
import { motion, AnimatePresence } from "framer-motion";
import { getSiteSettings } from "@/lib/cms-data";

const VIDEOS = [
  "/videos/global-trade-hero.mp4",
  "/videos/investment-hero.mp4"
];

const TICKER_ITEMS = [
  "Premium Basmati Rice",
  "Yellow Corn",
  "Sesame Seeds",
  "Fresh Mangoes",
  "IQF Potatoes",
  "Sunflower Oil",
  "Wheat",
  "Chickpeas",
  "Dried Fruits",
  "Spices & Herbs",
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "SECP Registered" },
  { icon: Award, label: "Quality Assured" },
  { icon: ShieldCheck, label: "Lab Tested" },
  { icon: Globe, label: "40+ Countries" },
];

export function LuxuryHero() {
  const [activeVideo, setActiveVideo] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVideo((prev) => (prev + 1) % VIDEOS.length);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-end overflow-hidden bg-[#050E0A]">

      {/* ── Video Backgrounds ── */}
      {VIDEOS.map((src, idx) => (
        <video
          key={src}
          src={src}
          ref={idx === 0 ? videoRef : undefined}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out ${
            idx === activeVideo ? "opacity-100" : "opacity-0"
          }`}
          autoPlay muted loop playsInline
        />
      ))}

      {/* ── Layered Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050E0A]/95 via-[#050E0A]/40 to-[#050E0A]/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050E0A]/80 via-transparent to-transparent pointer-events-none" />
      {/* Emerald tint overlay at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none"
        style={{ background: "linear-gradient(to top, hsl(158 59% 8% / 0.6), transparent)" }}
      />

      {/* ── Decorative Gold Lines ── */}
      <div className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, hsl(38 41% 59% / 0.5) 30%, hsl(38 41% 59% / 0.5) 70%, transparent)" }}
      />

      {/* ── Main Content ── */}
      <div className="relative z-20 container px-4 md:px-6 pb-20 pt-40 flex flex-col lg:flex-row items-end lg:items-center justify-between gap-16">

        {/* Left: Text Block */}
        <div className="max-w-3xl space-y-8">

          {/* Eyebrow Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full border backdrop-blur-md"
            style={{
              background: "hsl(43 85% 47% / 0.12)",
              borderColor: "hsl(43 85% 47% / 0.35)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: "hsl(43 85% 47%)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "hsl(43 85% 47%)" }} />
            </span>
            <span className="text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: "hsl(43 90% 68%)" }}>
              {getSiteSettings().hero.badge || "Pakistan's Premier Agricultural Exporter"}
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <h1 className="font-heading font-bold leading-[1.05] tracking-tight text-white">
              <span className="block text-5xl md:text-7xl lg:text-8xl">
                Connecting the World
              </span>
              <span className="block text-5xl md:text-7xl lg:text-8xl">
                to Pakistan's
              </span>
              <span
                className="block text-5xl md:text-7xl lg:text-8xl"
                style={{
                  background: "linear-gradient(130deg, hsl(43 90% 72%), hsl(43 85% 52%) 50%, hsl(43 90% 72%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Finest Produce.
              </span>
            </h1>
          </motion.div>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/75 max-w-2xl leading-relaxed font-light"
          >
            {getSiteSettings().hero.subheadline || "OG Exports (Private) Limited — a direct importer and exporter of premium agricultural commodities, serving verified buyers across 40+ countries with 5+ years of institutional trade expertise."}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="flex flex-wrap gap-4"
          >
            <Link href="/products">
              <button
                className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full font-heading font-semibold text-base transition-all duration-300 group"
                style={{
                  background: "hsl(158 59% 15%)",
                  color: "white",
                  border: "1px solid hsl(158 59% 25%)",
                  boxShadow: "0 4px 24px hsl(158 59% 15% / 0.5)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(158 55% 20%)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 32px hsl(158 59% 15% / 0.7)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15%)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px hsl(158 59% 15% / 0.5)";
                }}
              >
                Explore Products
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <InvestmentModuleOptional>
            <Link href="/invest">
              <button
                className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full font-heading font-semibold text-base transition-all duration-300 group"
                style={{
                  background: "hsl(43 85% 47%)",
                  color: "hsl(207 28% 8%)",
                  border: "none",
                  boxShadow: "0 2px 10px hsl(43 85% 47% / 0.30), 0 6px 28px hsl(43 85% 47% / 0.22)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px hsl(43 85% 47% / 0.40), 0 10px 40px hsl(43 85% 47% / 0.28)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.background = "hsl(43 85% 50%)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px hsl(43 85% 47% / 0.30), 0 6px 28px hsl(43 85% 47% / 0.22)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.background = "hsl(43 85% 47%)";
                }}
              >
                <TrendingUp className="w-4 h-4" />
                Investment Platform
              </button>
            </Link>
            </InvestmentModuleOptional>
            <Link href="/contact">
              <button
                className="inline-flex items-center gap-2.5 h-14 px-8 rounded-full font-heading font-semibold text-base transition-all duration-300 group"
                style={{
                  background: "hsl(0 0% 100% / 0.08)",
                  color: "white",
                  border: "1px solid hsl(0 0% 100% / 0.20)",
                  backdropFilter: "blur(12px)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.14)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.35)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.08)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.20)";
                }}
              >
                Request Inquiry
              </button>
            </Link>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={loaded ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.75 }}
            className="flex flex-wrap gap-5"
          >
            {TRUST_BADGES.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-white/60 text-sm">
                <b.icon className="w-4 h-4 text-emerald-400" />
                {b.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Live Stats Cards */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={loaded ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="hidden lg:flex flex-col gap-4 min-w-[220px]"
        >
          {[
            { value: "40+", label: "Active Markets", color: "hsl(38 41% 59%)" },
            { value: "30+", label: "Premium Commodities", color: "hsl(123 38% 55%)" },
            { value: "5+", label: "Years Experience", color: "white" },
          ].map((stat, i) => (
            <div
              key={i}
              className="px-6 py-5 rounded-2xl backdrop-blur-xl border"
              style={{
                background: "hsl(0 0% 0% / 0.38)",
                borderColor: "hsl(0 0% 100% / 0.10)",
              }}
            >
              <div className="text-3xl font-heading font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-white/55 text-xs mt-1 uppercase tracking-wider font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Commodity Ticker ── */}
      <div
        className="relative z-20 border-t overflow-hidden"
        style={{
          borderTopColor: "hsl(38 41% 59% / 0.25)",
          background: "hsl(0 0% 0% / 0.35)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex py-4">
          <div className="ticker-scroll flex items-center gap-0 whitespace-nowrap">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center">
                <span className="text-white/60 text-sm font-medium tracking-wider px-8 uppercase">
                  {item}
                </span>
                <span style={{ color: "hsl(38 41% 59% / 0.5)" }} className="text-xs">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Video Indicator Dots ── */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {VIDEOS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveVideo(i)}
            className="h-[3px] rounded-full transition-all duration-500"
            style={{
              width: i === activeVideo ? "28px" : "8px",
              background: i === activeVideo ? "hsl(38 41% 59%)" : "hsl(0 0% 100% / 0.3)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
