import type { InvestFacilityConfig } from "./invest-facility-config"

export const PLANT_CONFIG: InvestFacilityConfig = {
  layoutTitle: "Potato Processing Plant",
  layoutSubtitle: "Depalpur IQF Facility — Production, Expansion & Investment",
  projectCode: "OG-PP-2026",
  projectStatus: "Operational",
  hero: {
    eyebrow: "Strategic investment opportunity · 2026",
    title: "Invest in Pakistan's modern potato processing industry.",
    description:
      "A high-capacity IQF potato processing plant with washing, peeling, blanching, freezing and export-grade packaging — transparent milestones and long-term returns.",
    investCta: "Invest now",
    downloadCta: "Download memorandum",
    meetingCta: "Schedule meeting",
  },
  stats: [
    { label: "Plant capacity", value: "120 MT/day", change: "full capacity target", color: "text-emerald-500" },
    { label: "Current output", value: "72 MT/day", change: "60% utilization", color: "text-blue-500" },
    { label: "Total investment", value: "$1.20M", change: "+8.4% target", color: "text-accent" },
    { label: "Revenue this quarter", value: "$284.0K", change: "+22.4% YoY", color: "text-emerald-500" },
  ],
  utilizationBadge: "Operational",
  utilizationRows: [
    { label: "Overall output", value: "72 / 120 MT/day", pct: 60 },
    { label: "IQF freezing", value: "60 / 120 MT/day", pct: 50 },
    { label: "Blanching line", value: "85 / 120 MT/day", pct: 71 },
    { label: "Cold storage", value: "480 / 600 MT", pct: 80 },
  ],
  overviewTitle: "The essential terms of the OG Potato Processing Plant",
  overviewDetails: [
    { label: "Industry", value: "Food Processing & IQF Export" },
    { label: "Location", value: "Depalpur, District Okara, Punjab, Pakistan" },
    { label: "Investment model", value: "Private Equity Investment" },
    { label: "Target investment", value: "USD 1.20 Million" },
    { label: "Minimum investment", value: "USD 2,000" },
    { label: "Investment period", value: "18–24 months per expansion" },
    { label: "Expected annual ROI", value: "12%–22% projected" },
    { label: "Profit distribution", value: "Quarterly" },
    { label: "Capital protection", value: "Subject to investment agreement" },
  ],
  processingStages: [
    { id: 1, label: "Raw potato intake", desc: "Procurement from contracted farmers — Punjab & KPK", capacity: "120 MT/day", status: "operational", icon: "🥔" },
    { id: 2, label: "Washing & sorting", desc: "Industrial washing lines, automated weight sorting", capacity: "110 MT/day", status: "operational", icon: "💧" },
    { id: 3, label: "Peeling & slicing", desc: "Kiremko BV continuous peeling and slicing lines", capacity: "100 MT/day", status: "operational", icon: "⚙️" },
    { id: 4, label: "Blanching & dehydration", desc: "Steam blanching and hot-air dehydration tunnels", capacity: "85 MT/day", status: "partial", icon: "🌡️" },
    { id: 5, label: "IQF freezing", desc: "Individual Quick Freeze tunnel — Kiremko IQF system", capacity: "60 MT/day", status: "partial", icon: "❄️" },
    { id: 6, label: "Packaging & cold storage", desc: "Automated 10 kg / 25 kg export-grade packaging", capacity: "72 MT/day", status: "operational", icon: "📦" },
  ],
  timelineTitle: "Depalpur IQF Plant — development milestones",
  timelineSubtitle: "Project timeline",
  timeline: [
    { year: "2023", q: "Q1", label: "Land & infrastructure", desc: "3-acre facility acquired in Depalpur. Civil works begun.", done: true },
    { year: "2023", q: "Q3", label: "Machinery import", desc: "Kiremko BV processing lines imported from Netherlands.", done: true },
    { year: "2024", q: "Q1", label: "Phase 1 commissioning", desc: "Washing, sorting and peeling lines operational.", done: true },
    { year: "2024", q: "Q3", label: "First export contract", desc: "Signed contract with Saudi Arabian importer.", done: true },
    { year: "2025", q: "Q2", label: "IQF line 1 installed", desc: "Individual Quick Freeze tunnel 1 commissioned.", done: true },
    { year: "2026", q: "Q1", label: "Solar energy online", desc: "250 kW solar installation completed.", done: true },
    { year: "2026", q: "Q3", label: "IQF line 2 (planned)", desc: "Second IQF tunnel to double freezing capacity.", done: false },
    { year: "2027", q: "Q1", label: "Full capacity target", desc: "120 MT/day full plant utilization achieved.", done: false },
  ],
  productionData: [
    { month: "Jan", output: 48, revenue: 144000, profit: 22000 },
    { month: "Feb", output: 52, revenue: 156000, profit: 25000 },
    { month: "Mar", output: 58, revenue: 174000, profit: 31000 },
    { month: "Apr", output: 63, revenue: 189000, profit: 36000 },
    { month: "May", output: 68, revenue: 204000, profit: 41000 },
    { month: "Jun", output: 71, revenue: 213000, profit: 45000 },
    { month: "Jul", output: 72, revenue: 216000, profit: 48000 },
  ],
  operationalUpdates: [
    { date: "Jul 10, 2026", title: "IQF Line 1 — full operations", desc: "Primary IQF freezing line reached full operational capacity at 60 MT/day." },
    { date: "Jul 05, 2026", title: "Q2 2026 audit report released", desc: "Independent audit confirms 99.2% food safety compliance. Full report available." },
    { date: "Jun 28, 2026", title: "IQF Phase 2 funding — 72%", desc: "$273,600 of $380,000 target raised. Expansion on track for Q3 start." },
    { date: "Jun 15, 2026", title: "June production target met", desc: "Monthly production target of 70 MT/day achieved. Revenue: $213,000." },
    { date: "Jun 01, 2026", title: "Solar installation completed", desc: "250 kW solar system fully operational. Energy costs reduced by 32%." },
    { date: "May 20, 2026", title: "New export contract — UAE", desc: "Signed 12-month supply agreement with Dubai-based frozen foods distributor." },
  ],
  allocation: [
    { label: "IQF expansion", pct: 32, value: "$384K" },
    { label: "Dehydrated powder line", pct: 15, value: "$180K" },
    { label: "Solar installation", pct: 8, value: "$95K" },
    { label: "Cold storage upgrade", pct: 18, value: "$216K" },
    { label: "Working capital", pct: 12, value: "$144K" },
    { label: "Quality & certification", pct: 5, value: "$60K" },
    { label: "Contingency reserve", pct: 10, value: "$121K" },
  ],
  allocationTitle: "How expansion capital is planned",
  whyThisProject: [
    { title: "Export demand", desc: "Growing GCC and regional frozen food markets" },
    { title: "Proven operations", desc: "Existing plant with active export contracts" },
    { title: "Energy efficiency", desc: "Solar reducing operating costs by 32%" },
    { title: "Scalable IQF capacity", desc: "Phase 2 doubles freezing output" },
    { title: "Food safety certified", desc: "99.2% audit compliance rate" },
    { title: "Experienced management", desc: "OG Group operations leadership" },
  ],
  faqs: [
    {
      question: "Why invest in the OG Potato Processing Plant?",
      answer:
        "Pakistan's potato processing and IQF export sector continues to grow. The Depalpur facility has proven operations, active export contracts and expansion projects with transparent funding milestones.",
    },
    {
      question: "How are profits distributed?",
      answer:
        "Projected returns are distributed quarterly once expansion milestones are met, subject to the final investment agreement and audited project performance.",
    },
    {
      question: "What is the minimum investment?",
      answer:
        "Minimum participation varies by expansion project, starting from USD 2,000. Investors may increase allocation in subsequent funding windows.",
    },
    {
      question: "Can international investors participate?",
      answer:
        "Yes. International investors can participate following KYC verification, source-of-funds review and applicable investment documentation.",
    },
    {
      question: "How is capital managed?",
      answer:
        "Capital is deployed against approved expansion milestones with management reporting, financial controls and a defined contingency reserve.",
    },
  ],
  footerCta: {
    title: "Become a strategic investor in Pakistan's growing food processing industry.",
    description: "Review the memorandum, then speak with the OG Capital investment team.",
    investLabel: "Invest now",
    contactLabel: "Contact team",
  },
  downloadFilename: "og-potato-plant-investment-memorandum.txt",
  downloadContents:
    "OG POTATO PROCESSING PLANT\nInvestment Memorandum\nTarget: USD 1.20 Million\nMinimum: USD 2,000\nProjected ROI: 12%–22% annually\n",
  investCategory: "processing",
  apiProjectType: "plant",
}
