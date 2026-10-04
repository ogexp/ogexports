import React from "react";
import { LuxuryHero } from "@/components/home/LuxuryHero";
import { LuxuryAbout } from "@/components/home/LuxuryAbout";
import { LuxuryProducts } from "@/components/home/LuxuryProducts";
import { LuxuryWhyChoose } from "@/components/home/LuxuryWhyChoose";
import { LuxuryProcess } from "@/components/home/LuxuryProcess";
import { LuxuryIndustries } from "@/components/home/LuxuryIndustries";
import { LuxuryGlobalMarkets } from "@/components/home/LuxuryGlobalMarkets";
import { LuxuryQuality } from "@/components/home/LuxuryQuality";
import { LuxuryInvestment } from "@/components/home/LuxuryInvestment";
import { LuxuryPortal } from "@/components/home/LuxuryPortal";
import { LuxuryFreight } from "@/components/home/LuxuryFreight";
import { LuxuryTestimonials } from "@/components/home/LuxuryTestimonials";
import { LuxuryCTA } from "@/components/home/LuxuryCTA";
import { LuxuryMilestones } from "@/components/home/LuxuryMilestones";
import { useSafeAuth } from "@/lib/use-safe-auth";

export default function Home() {
  const { isSignedIn, accountType } = useSafeAuth();
  const showInvestment = isSignedIn && accountType === "investor";

  return (
    <div className="flex flex-col bg-background text-foreground overflow-hidden">
      {/* 1. Luxury Hero — Full-screen cinematic with video, gold accents */}
      <LuxuryHero />

      {/* 2. About + Stats Strip */}
      <LuxuryAbout />

      {/* 3. Premium Products Showcase */}
      <LuxuryProducts />

      {/* 4. Why Choose OG Exports */}
      <LuxuryWhyChoose />

      {/* 5. Export Process + Investment Process */}
      <LuxuryProcess />

      {/* 6. Industries We Serve */}
      <LuxuryIndustries />

      {/* 7. Global Markets */}
      <LuxuryGlobalMarkets />

      {/* 8. Quality Assurance & Certifications */}
      <LuxuryQuality />

      {/* 9. Investment Opportunities Preview — investors only */}
      {showInvestment && <LuxuryInvestment />}

      {/* 10. Buyer & Supplier Portal */}
      <LuxuryPortal />

      {/* 11. Freight Forwarding Services */}
      <LuxuryFreight />

      {/* 12. Testimonials */}
      <LuxuryTestimonials />

      {/* 13. Business Milestones */}
      <LuxuryMilestones />

      {/* 14. CTA + Contact Section */}
      <LuxuryCTA />

      {/* 14. AI Trade Assistant — Floating Chat */}
    </div>
  );
}
