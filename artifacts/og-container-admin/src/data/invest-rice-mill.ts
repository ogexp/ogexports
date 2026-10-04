import type { InvestFacilityConfig } from "./invest-facility-config"

export const RICE_MILL_CONFIG: InvestFacilityConfig = {
  layoutTitle: "OG Rice Mill Project",
  layoutSubtitle: "Depalpur, Okara · Processing & Milling · Agriculture & Rice Export",
  projectCode: "OG-RM-2026",
  projectStatus: "Planning & Development",
  hero: {
    eyebrow: "Strategic investment opportunity · 2026",
    title: "Invest in Pakistan's modern rice milling industry.",
    description:
      "A high-capacity rice processing mill designed for basmati export, white rice production and value-added by-products — with transparent milestones and sustainable long-term returns.",
    investCta: "Invest now",
    downloadCta: "Download memorandum",
    meetingCta: "Schedule meeting",
  },
  stats: [
    { label: "Installed capacity", value: "120 T/day", change: "full paddy processing", color: "text-emerald-500" },
    { label: "Current readiness", value: "58 T/day", change: "48% utilization", color: "text-blue-500" },
    { label: "Target investment", value: "$1.50M", change: "USD target", color: "text-accent" },
    { label: "Projected annual revenue", value: "$480.0K", change: "+18.4% scenario", color: "text-emerald-500" },
  ],
  utilizationBadge: "Development ready",
  utilizationRows: [
    { label: "Overall milling output", value: "58 / 120 T/day", pct: 48 },
    { label: "Basmati rice line", value: "32 / 60 T/day", pct: 53 },
    { label: "Long-grain white rice", value: "18 / 40 T/day", pct: 45 },
    { label: "Rice bran & by-products", value: "8 / 20 T/day", pct: 40 },
  ],
  overviewTitle: "The essential terms of the OG Rice Mill Project",
  overviewDetails: [
    { label: "Industry", value: "Agriculture & Rice Processing" },
    { label: "Location", value: "Depalpur, District Okara, Punjab, Pakistan" },
    { label: "Investment model", value: "Private Equity Investment" },
    { label: "Target investment", value: "USD 1.50 Million" },
    { label: "Minimum investment", value: "USD 100" },
    { label: "Investment period", value: "5 years" },
    { label: "Expected annual ROI", value: "12%–18% projected" },
    { label: "Profit distribution", value: "Quarterly" },
    { label: "Capital protection", value: "Subject to investment agreement" },
  ],
  processingStages: [
    {
      id: 1,
      label: "Stage 1: Paddy reception & weighing",
      desc: "Incoming paddy weighed, sampled and graded at the intake point from supplier trucks.",
      capacity: "120 T/day",
      status: "partial",
    },
    {
      id: 2,
      label: "Stage 2: Pre-cleaning & stone removal",
      desc: "Destoner and pre-cleaner remove stones, dust and foreign matter from raw paddy.",
      capacity: "110 T/day",
      status: "partial",
    },
    {
      id: 3,
      label: "Stage 3: De-husking / hulling",
      desc: "Rubber-roll husker separates the husk to produce brown rice ready for milling.",
      capacity: "100 T/day",
      status: "planned",
    },
    {
      id: 4,
      label: "Stage 4: Whitening & milling",
      desc: "Abrasive whitener removes bran layers to produce polished white rice.",
      capacity: "100 T/day",
      status: "planned",
    },
    {
      id: 5,
      label: "Stage 5: Optical sorting & grading",
      desc: "CCD optical sorter removes discoloured, chalky and broken grains automatically.",
      capacity: "100 T/day",
      status: "planned",
    },
    {
      id: 6,
      label: "Stage 6: Polishing, bagging & dispatch",
      desc: "25 / 50 kg vacuum-sealed packaging for domestic and export distribution.",
      capacity: "120 T/day",
      status: "planned",
    },
  ],
  timelineTitle: "Depalpur Rice Mill — development milestones",
  timelineSubtitle: "Project timeline",
  timeline: [
    { year: "2026", q: "Q3", label: "Land & infrastructure", desc: "Site due diligence and land acquisition documentation in Depalpur.", done: false },
    { year: "2026", q: "Q4", label: "Engineering & design", desc: "Final mill layout, machinery specifications and civil drawings.", done: false },
    { year: "2027", q: "Q1", label: "Construction", desc: "Civil works, storage structures and utility infrastructure on site.", done: false },
    { year: "2027", q: "Q2", label: "Machinery installation", desc: "Huskers, whiteners, optical sorters and bagging lines commissioned.", done: false },
    { year: "2027", q: "Q3", label: "Trial milling", desc: "Pilot batches processed and quality grading systems validated.", done: false },
    { year: "2027", q: "Q4", label: "Commercial operations", desc: "First commercial rice dispatches to domestic and export buyers.", done: false },
  ],
  productionData: [
    { month: "Jan", output: 32, revenue: 68000, profit: 9000 },
    { month: "Feb", output: 38, revenue: 82000, profit: 12000 },
    { month: "Mar", output: 44, revenue: 96000, profit: 15000 },
    { month: "Apr", output: 48, revenue: 108000, profit: 18000 },
    { month: "May", output: 52, revenue: 120000, profit: 22000 },
    { month: "Jun", output: 55, revenue: 132000, profit: 28000 },
    { month: "Jul", output: 58, revenue: 145000, profit: 32000 },
  ],
  operationalUpdates: [
    { date: "Jul 18, 2026", title: "Capacity study approved", desc: "Feasibility review confirmed a 100–120 T/day modular milling line." },
    { date: "Jul 10, 2026", title: "Paddy procurement network established", desc: "Agreements with paddy traders in Okara and Sahiwal districts." },
    { date: "Jul 04, 2026", title: "Funding window opened", desc: "First close is now accepting strategic investor commitments." },
    { date: "Jun 26, 2026", title: "Land due diligence complete", desc: "Depalpur site assessment and access review completed." },
    { date: "Jun 18, 2026", title: "OG Group milling team appointed", desc: "Procurement and commissioning leads have joined the project." },
  ],
  allocation: [
    { label: "Land acquisition", pct: 10, value: "$150K" },
    { label: "Civil construction", pct: 20, value: "$300K" },
    { label: "Plant & machinery", pct: 33, value: "$495K" },
    { label: "Storage & silos", pct: 13, value: "$195K" },
    { label: "Quality laboratory", pct: 6, value: "$90K" },
    { label: "Utilities & electrical", pct: 10, value: "$150K" },
    { label: "Working capital", pct: 6, value: "$90K" },
    { label: "Contingency reserve", pct: 2, value: "$30K" },
  ],
  allocationTitle: "How the USD 1.50M target is planned",
  whyThisProject: [
    { title: "4th largest rice exporter", desc: "Pakistan exports millions of tonnes of rice annually" },
    { title: "Punjab paddy belt location", desc: "Direct access to Okara and Sahiwal paddy corridors" },
    { title: "Experienced milling team", desc: "OG Group operations and agri-processing leadership" },
    { title: "Multiple revenue streams", desc: "Basmati, white rice, broken rice and rice bran oil" },
    { title: "Export-ready operations", desc: "Direct access to Middle East, GCC and EU markets" },
    { title: "Scalable business model", desc: "Modular milling lines for phased capacity expansion" },
  ],
  faqs: [
    {
      question: "Why invest in the OG Rice Mill Project?",
      answer:
        "Pakistan is the world's 4th largest rice exporter and Punjab's paddy belt produces abundant raw material. The project is strategically located near major paddy corridors in Okara with a scalable milling model and strong domestic and export market access.",
    },
    {
      question: "How are profits distributed?",
      answer:
        "Projected returns are distributed quarterly once commercial milling operations begin, subject to the final investment agreement and audited project performance.",
    },
    {
      question: "What is the minimum investment?",
      answer:
        "The minimum participation is USD 100. Investors may increase their allocation in subsequent funding windows, subject to availability.",
    },
    {
      question: "Can international investors participate?",
      answer:
        "Yes. International investors can participate following KYC verification, source-of-funds review and the applicable investment documentation.",
    },
    {
      question: "How is capital managed?",
      answer:
        "Capital is deployed against approved project milestones with management reporting, financial controls and a defined contingency reserve.",
    },
  ],
  footerCta: {
    title: "Become a strategic investor in Pakistan's growing rice milling industry.",
    description: "Review the memorandum, then speak with the OG Capital investment team.",
    investLabel: "Invest now",
    contactLabel: "Contact team",
  },
  downloadFilename: "og-rice-mill-memorandum.txt",
  downloadContents:
    "OG RICE MILL PROJECT\nInvestment Memorandum\nTarget: USD 1.50 Million\nMinimum: USD 100\nProjected ROI: 12%–18% annually\n",
  investCategory: "processing",
  apiProjectType: "ricemill",
}
