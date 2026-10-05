import React from "react";
import { Leaf, ShieldCheck, Box, Ship, Anchor, UserCheck, DollarSign, BarChart2, Wallet } from "lucide-react";
import { StepTimeline } from "./StepTimeline";

const EXPORT_STEPS = [
  { icon: Leaf, title: "Direct Sourcing", description: "We procure directly from Punjab and Sindh farming communities at harvest, locking in premium quality and competitive pricing." },
  { icon: ShieldCheck, title: "Quality Testing", description: "Every lot undergoes rigorous laboratory analysis — moisture, purity, broken grain %, foreign matter — against EU, FDA, and Gulf standards." },
  { icon: Box, title: "Precision Packing", description: "Export-grade packaging in climate-controlled facilities. Custom branding, weight, and markings per buyer specifications." },
  { icon: Ship, title: "Port & Documentation", description: "Full customs clearance, phytosanitary certification, COA, packing lists, and LC-compliant commercial invoices prepared in-house." },
  { icon: Anchor, title: "Global Delivery", description: "Review shipment milestones recorded in the buyer or investor portal; live carrier location is not shown." },
];

const INVESTMENT_STEPS = [
  { icon: UserCheck, title: "Register & KYC", description: "Create your investor account and complete the required identity verification." },
  { icon: BarChart2, title: "Choose Investment", description: "Browse open containers, the Fresh F&V Market project, or the Potato Processing Plant. Review full transparency documents." },
  { icon: DollarSign, title: "Deposit Funds", description: "Use only the payment instructions and minimums shown in the verified investor portal for an approved project." },
  { icon: Ship, title: "Review Milestones", description: "See loading stages and port-clearance milestones after they are recorded in your investor dashboard." },
  { icon: Wallet, title: "Review Payout Status", description: "Check the payout status and recorded profit against the signed project terms in your investor portal." },
];

export function ProcessTimelines() {
  return (
    <section className="py-24 bg-card/30 relative border-b border-border">
      <div className="container px-4 md:px-6 space-y-32">
        <StepTimeline
          title="Our Export Process"
          subtitle="From farm to destination — every step executed with institutional precision."
          steps={EXPORT_STEPS}
        />

        <StepTimeline
          title="How Investment Works"
          subtitle="A fully transparent, trackable process from deposit to return."
          steps={INVESTMENT_STEPS}
        />
      </div>
    </section>
  );
}
