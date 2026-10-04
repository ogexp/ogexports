import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "OG Exports has been our trusted Basmati supplier for three consecutive seasons. Their quality documentation is the most thorough we've encountered from any Pakistani exporter — zero rejections at UK customs.",
    author: "James Whitfield",
    role: "Head of Procurement",
    company: "Kingsman Foods Ltd, United Kingdom",
    flag: "🇬🇧",
    stars: 5,
  },
  {
    quote: "We source Yellow Corn and Sesame through OG Exports for our Karachi distribution hub. Consistent grade, reliable timelines, and a team that communicates proactively throughout the shipment.",
    author: "Mohammed Al-Rashidi",
    role: "Import Manager",
    company: "Gulf Agro Trading, UAE",
    flag: "🇦🇪",
    stars: 5,
  },
  {
    quote: "Their containerised investment product delivered exactly as promised. The transparency throughout the voyage — from loading to buyer settlement — was exceptional. We've already invested in two more containers.",
    author: "Farida Kasimova",
    role: "Portfolio Manager",
    company: "AgroCapital Partners, Singapore",
    flag: "🇸🇬",
    stars: 5,
  },
  {
    quote: "The fresh mango season exports were handled flawlessly. From farm-level coordination to cold-chain logistics at Port Qasim, OG Exports managed every detail. Our German retail partner was impressed.",
    author: "Klaus Baumgarten",
    role: "CEO",
    company: "EuroFresh GmbH, Germany",
    flag: "🇩🇪",
    stars: 5,
  },
  {
    quote: "As a Malaysian rice importer, finding a reliable Pakistani supplier with quality certification was our priority. OG Exports met every requirement and has been a consistent partner for over three years.",
    author: "Tan Wei Lin",
    role: "Director of Operations",
    company: "Pacific Grain Co., Malaysia",
    flag: "🇲🇾",
    stars: 5,
  },
  {
    quote: "The KYC verification process was smooth, and our investment dashboard provides more detail than we expected. For investors in the agricultural trade space, OG Exports is a serious and professional partner.",
    author: "Aisha Nkrumah",
    role: "Investment Director",
    company: "AfriTrade Capital, Kenya",
    flag: "🇰🇪",
    stars: 5,
  },
];

export function LuxuryTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = TESTIMONIALS[activeIndex];

  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(207 24% 16%)" }}
    >
      {/* Decorative */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(158 59% 15% / 0.30) 0%, transparent 70%)",
          transform: "translate(-30%, -30%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(38 41% 59% / 0.10) 0%, transparent 70%)",
          transform: "translate(30%, 30%)",
        }}
      />

      {/* Gold top line */}
      <div
        className="absolute top-0 inset-x-0 h-[1px]"
        style={{ background: "linear-gradient(to right, transparent, hsl(38 41% 59% / 0.5) 30%, hsl(38 41% 59% / 0.5) 70%, transparent)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border"
            style={{
              background: "hsl(38 41% 59% / 0.12)",
              borderColor: "hsl(38 41% 59% / 0.30)",
              color: "hsl(38 55% 72%)",
            }}
          >
            Client Testimonials
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white leading-[1.1]">
            Trusted by Global
            <span className="block" style={{ color: "hsl(38 55% 72%)" }}>
              Trade Leaders
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(38 41% 59%)" }} />
        </div>

        {/* Featured Testimonial */}
        <div
          className="max-w-4xl mx-auto p-10 md:p-14 rounded-3xl border mb-12 relative"
          style={{
            background: "hsl(0 0% 100% / 0.04)",
            borderColor: "hsl(38 41% 59% / 0.20)",
          }}
        >
          {/* Large quote mark */}
          <Quote
            className="absolute top-8 left-10 w-16 h-16 opacity-10"
            style={{ color: "hsl(38 41% 59%)" }}
          />

          {/* Stars */}
          <div className="flex gap-1 mb-6">
            {Array(active.stars).fill(0).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" style={{ color: "hsl(38 41% 59%)" }} />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-xl md:text-2xl text-white/80 leading-relaxed mb-10 font-light italic relative z-10">
            "{active.quote}"
          </blockquote>

          {/* Attribution */}
          <div className="flex items-center gap-5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{
                background: "hsl(158 59% 15% / 0.40)",
                border: "2px solid hsl(38 41% 59% / 0.30)",
              }}
            >
              {active.flag}
            </div>
            <div>
              <div className="font-heading font-bold text-white text-lg">{active.author}</div>
              <div className="text-white/50 text-sm">{active.role}</div>
              <div className="text-sm font-medium" style={{ color: "hsl(38 55% 65%)" }}>
                {active.company}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setActiveIndex(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border"
            style={{
              background: "hsl(0 0% 100% / 0.06)",
              borderColor: "hsl(0 0% 100% / 0.12)",
              color: "white",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "hsl(38 41% 59%)";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59%)";
              (e.currentTarget as HTMLElement).style.color = "hsl(207 24% 10%)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.06)";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.12)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dot indicators */}
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="h-[3px] rounded-full transition-all duration-400"
                style={{
                  width: i === activeIndex ? "28px" : "8px",
                  background: i === activeIndex ? "hsl(38 41% 59%)" : "hsl(0 0% 100% / 0.20)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setActiveIndex(i => (i + 1) % TESTIMONIALS.length)}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border"
            style={{
              background: "hsl(0 0% 100% / 0.06)",
              borderColor: "hsl(0 0% 100% / 0.12)",
              color: "white",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "hsl(38 41% 59%)";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59%)";
              (e.currentTarget as HTMLElement).style.color = "hsl(207 24% 10%)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.06)";
              (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.12)";
              (e.currentTarget as HTMLElement).style.color = "white";
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Mini testimonial cards below */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-10">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="p-4 rounded-2xl border text-center transition-all duration-300"
              style={i === activeIndex ? {
                background: "hsl(38 41% 59% / 0.12)",
                borderColor: "hsl(38 41% 59% / 0.35)",
              } : {
                background: "hsl(0 0% 100% / 0.03)",
                borderColor: "hsl(0 0% 100% / 0.06)",
              }}
              onMouseEnter={e => {
                if (i !== activeIndex) (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.06)";
              }}
              onMouseLeave={e => {
                if (i !== activeIndex) (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.03)";
              }}
            >
              <div className="text-2xl mb-1">{t.flag}</div>
              <div className="text-white/40 text-[10px] truncate">{t.company.split(",")[1]?.trim() || t.company}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
