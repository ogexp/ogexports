import React, { useState, useEffect } from "react";
import { ArrowRight, Globe, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { InvestmentModuleOptional } from "@/components/auth/InvestmentModuleGate";

const VIDEOS = [
  "/videos/hero.mp4",
  "/videos/global-trade-hero.mp4",
  "/videos/investment-hero.mp4"
];

export function Hero() {
  const [activeVideo, setActiveVideo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVideo((prev) => (prev + 1) % VIDEOS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-black">
      {/* Video Backgrounds */}
      {VIDEOS.map((src, idx) => (
        <video
          key={src}
          src={src}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ease-in-out ${
            idx === activeVideo ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
        />
      ))}

      {/* Gradient overlays — hardcoded dark so hero is always cinematic */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/25 to-transparent z-10 pointer-events-none" />

      <div className="container relative z-20 px-4 md:px-6 pt-32 pb-24 h-full flex flex-col justify-center">
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/20 backdrop-blur-md text-white text-sm font-medium shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Pakistan's Premium Agricultural Exporter
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold tracking-tighter text-white leading-[1.1] drop-shadow-xl">
            Certainty in <br/>
            <span className="text-gradient from-accent via-yellow-200 to-accent drop-shadow-2xl">Every Shipment.</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/90 max-w-2xl leading-relaxed drop-shadow-md font-light">
            Premium Pakistani agricultural commodities exported to 40+ countries. Direct from farm. Backed by 5+ years of institutional trade expertise.
          </p>

          <div className="flex flex-wrap gap-4 pt-6">
            <Link href="/products">
              <Button size="lg" className="text-base h-14 px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 border-0 gap-2">
                Explore Products <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <InvestmentModuleOptional>
            <Link href="/invest">
              <Button size="lg" variant="outline" className="text-base h-14 px-8 bg-accent/10 backdrop-blur-md border-accent/30 text-accent hover:bg-accent/20 hover:border-accent hover:text-white gap-2">
                Investment Platform <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            </InvestmentModuleOptional>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-base h-14 px-8 bg-black/40 backdrop-blur-md border-white/20 text-white hover:bg-white/10 hover:border-white/40">
                Request Inquiry
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-6 pt-2 text-white/70 text-sm">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> SECP Registered</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> SECP Compliant</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Quality Assured</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Lab Tested</span>
          </div>
        </div>

        {/* Live Stats Overlay */}
        <div className="absolute bottom-8 right-8 hidden lg:flex gap-6 animate-in fade-in slide-in-from-right-8 duration-1000 delay-500">
          <div className="glass-panel bg-black/40 backdrop-blur-xl border-white/10 p-6 rounded-2xl text-white min-w-[200px]">
            <div className="text-accent text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Global Reach
            </div>
            <div className="text-4xl font-heading font-bold">40+</div>
            <div className="text-white/60 text-sm mt-1">Active Markets</div>
          </div>
          <div className="glass-panel bg-black/40 backdrop-blur-xl border-white/10 p-6 rounded-2xl text-white min-w-[200px]">
            <div className="text-primary text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Direct Supply
            </div>
            <div className="text-4xl font-heading font-bold">30+</div>
            <div className="text-white/60 text-sm mt-1">Premium Commodities</div>
          </div>
        </div>
      </div>
    </section>
  );
}
