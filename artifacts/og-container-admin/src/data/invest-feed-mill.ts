import type { InvestFacilityConfig } from "./invest-facility-config"

export const FEED_MILL_CONFIG: InvestFacilityConfig = {
  layoutTitle: "OG Feed Mill Project",
  layoutSubtitle: "Depalpur, Okara · Planning & Development · Agriculture & Animal Nutrition",
  projectCode: "OG-FM-2026",
  projectStatus: "Planning & Development",
  hero: {
    eyebrow: "Strategic investment opportunity · 2026",
    title: "Invest in Pakistan's modern feed manufacturing industry.",
    description:
      "A high-capacity animal feed mill designed for poultry, dairy, livestock and aquaculture sectors — with transparent milestones and sustainable long-term returns.",
    investCta: "Invest now",
    downloadCta: "Download memorandum",
    meetingCta: "Schedule meeting",
  },
  stats: [
    { label: "Installed capacity", value: "150 T/day", change: "full capacity target", color: "text-emerald-500" },
    { label: "Current readiness", value: "78 T/day", change: "52% utilization", color: "text-blue-500" },
    { label: "Target investment", value: "$1.50M", change: "USD target", color: "text-accent" },
    { label: "Projected annual revenue", value: "$412.0K", change: "+18.4% scenario", color: "text-emerald-500" },
  ],
  utilizationBadge: "Development ready",
  utilizationRows: [
    { label: "Overall output", value: "78 / 150 T/day", pct: 52 },
    { label: "Poultry feed line", value: "62 / 100 T/day", pct: 62 },
    { label: "Dairy & cattle line", value: "38 / 75 T/day", pct: 51 },
    { label: "Fish feed line", value: "14 / 25 T/day", pct: 56 },
  ],
  overviewTitle: "The essential terms of the OG Feed Mill Project",
  overviewDetails: [
    { label: "Industry", value: "Agriculture & Animal Nutrition" },
    { label: "Location", value: "Depalpur, District Okara, Punjab, Pakistan" },
    { label: "Investment model", value: "Private Equity Investment" },
    { label: "Target investment", value: "USD 1.50 Million" },
    { label: "Minimum investment", value: "USD 100" },
    { label: "Investment period", value: "5 years" },
    { label: "Expected annual ROI", value: "12%–18% projected" },
    { label: "Profit distribution", value: "Quarterly" },
    { label: "Capital protection", value: "Subject to investment agreement." },
  ],
  processingStages: [
    { id: 1, label: "Raw material intake", desc: "Corn, soybean meal & bran procurement from Punjab supply partners", capacity: "120 T/day", status: "partial" },
    { id: 2, label: "Batching & dosing", desc: "Automated weighing for consistent formulation accuracy", capacity: "100 T/day", status: "partial" },
    { id: 3, label: "Grinding & mixing", desc: "Hammer mill and twin-shaft mixing for uniform nutrition", capacity: "100 T/day", status: "planned" },
    { id: 4, label: "Pelleting & cooling", desc: "Steam conditioning, pelleting and counterflow cooling", capacity: "100 T/day", status: "planned" },
    { id: 5, label: "Quality assurance", desc: "Moisture, protein and aflatoxin testing in the onsite laboratory", capacity: "All batches", status: "planned" },
    { id: 6, label: "Bagging & dispatch", desc: "25 / 50 kg packaging for regional distributors and farms", capacity: "150 T/day", status: "planned" },
  ],
  timelineTitle: "Depalpur Feed Mill — development milestones",
  timelineSubtitle: "Project timeline",
  timeline: [
    { year: "2026", q: "Q3", label: "Land & infrastructure", desc: "Site due diligence and land acquisition documentation.", done: false },
    { year: "2026", q: "Q4", label: "Engineering & design", desc: "Final process design, vendor selection and civil drawings.", done: false },
    { year: "2027", q: "Q1", label: "Construction", desc: "Civil works, silos and utility infrastructure on the Depalpur site.", done: false },
    { year: "2027", q: "Q2", label: "Machinery installation", desc: "Grinding, batching, pelleting and packing equipment commissioned.", done: false },
    { year: "2027", q: "Q3", label: "Trial production", desc: "Pilot batches tested and quality systems validated.", done: false },
    { year: "2027", q: "Q4", label: "Commercial operations", desc: "First commercial dispatches to contracted distributors.", done: false },
  ],
  productionData: [
    { month: "Jan", output: 42, revenue: 88000, profit: 12000 },
    { month: "Feb", output: 48, revenue: 102000, profit: 15000 },
    { month: "Mar", output: 55, revenue: 118000, profit: 18000 },
    { month: "Apr", output: 62, revenue: 135000, profit: 22000 },
    { month: "May", output: 68, revenue: 152000, profit: 28000 },
    { month: "Jun", output: 74, revenue: 168000, profit: 32000 },
    { month: "Jul", output: 78, revenue: 185000, profit: 36000 },
  ],
  operationalUpdates: [
    { date: "Jul 18, 2026", title: "Capacity study approved", desc: "Feasibility review confirmed a 100–150 T/day modular line." },
    { date: "Jul 12, 2026", title: "Feed formulation lab scoped", desc: "Quality lab specification added for poultry, dairy and aqua formulations." },
    { date: "Jul 04, 2026", title: "Funding window opened", desc: "First close is now accepting strategic investor commitments." },
    { date: "Jun 26, 2026", title: "Land due diligence complete", desc: "Depalpur site assessment and access review completed." },
    { date: "Jun 18, 2026", title: "OG Group operations team appointed", desc: "Procurement and commissioning leads have joined the project." },
  ],
  allocation: [
    { label: "Land acquisition", pct: 11, value: "$165K" },
    { label: "Civil construction", pct: 22, value: "$330K" },
    { label: "Plant & machinery", pct: 31, value: "$465K" },
    { label: "Storage silos", pct: 12, value: "$180K" },
    { label: "Quality laboratory", pct: 6, value: "$90K" },
    { label: "Utilities & electrical", pct: 10, value: "$150K" },
    { label: "Working capital", pct: 6, value: "$90K" },
    { label: "Contingency reserve", pct: 2, value: "$30K" },
  ],
  allocationTitle: "How the USD 1.50M target is planned",
  whyThisProject: [
    { title: "Strong market demand", desc: "Growing feed demand across Pakistan" },
    { title: "Strategic location", desc: "Close to Punjab's agriculture belt" },
    { title: "Experienced management", desc: "OG Group operations leadership" },
    { title: "Multiple revenue streams", desc: "Poultry, dairy, cattle and fish feed" },
    { title: "Scalable business", desc: "Modular capacity for future phases" },
    { title: "Export potential", desc: "Regional markets after commissioning" },
  ],
  faqs: [
    {
      question: "Why invest in the OG Feed Mill Project?",
      answer:
        "Pakistan's poultry, dairy, livestock and aquaculture sectors continue to expand. The project is positioned close to grain supply and major livestock corridors in Punjab, with a scalable production model and multiple customer segments.",
    },
    {
      question: "How are profits distributed?",
      answer:
        "Projected returns are distributed quarterly once commercial operations begin, subject to the final investment agreement and audited project performance.",
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
    title: "Become a strategic investor in Pakistan's growing animal feed industry.",
    description: "Review the memorandum, then speak with the OG Capital investment team.",
    investLabel: "Invest now",
    contactLabel: "Contact team",
  },
  downloadFilename: "og-feed-mill-investment-memorandum.txt",
  downloadContents:
    "OG FEED MILL PROJECT\nInvestment Memorandum\nTarget: USD 1.50 Million\nMinimum: USD 100\nProjected ROI: 12%–18% annually\n",
  investCategory: "processing",
  apiProjectType: "feed",
}
