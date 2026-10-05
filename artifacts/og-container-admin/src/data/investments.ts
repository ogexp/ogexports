export interface ContainerInvestment {
  id: string; slug: string; commodity: string; variety: string;
  tradeDirection?: 'export' | 'import';
  containerType?: '20ft' | '40ft' | '40ft reefer' | '20ft reefer'; containerValue?: number | null;
  containerNumber?: string;
  origin: string; portOfLoading?: string;
  destination: string; portOfDischarge?: string; destinationCountry: string; destinationFlag: string;
  fundingDeadlineDate: string; // ISO date
  minInvestment: number | null; maxInvestment: number | null;
  currentFunding: number | null; targetFunding: number | null; totalInvestors: number | null;
  fundingPercentage?: number | null; remainingAmount?: number | null;
  totalAmountInvested: number | null;
  expectedReturnPct: number | null; investmentPeriodDays: number | null;
  status: 'open' | 'funded' | 'shipping' | 'completed';
  imageUrl: string; riskLevel?: 'low' | 'medium' | 'high';
  productCategory: string;
  description: string;
  incoterm?: 'FOB' | 'CIF' | 'CNF' | 'EXW' | 'CFR' | 'Air Shipment';
  paymentTerms?: string;
  currency?: string;
  shippingLine?: string;
  vesselName?: string;
  estimatedDepartureDate?: string;
  estimatedArrivalDate?: string;
  expectedProjectCompletionDate?: string;
  currentProjectStage?: string;
}

export const CONTAINER_INVESTMENTS: ContainerInvestment[] = [
  {
    id: "cnt-001", slug: "premium-basmati-rice-dubai", commodity: "Premium Basmati Rice", variety: "Super Basmati 1121",
    tradeDirection: "export",
    containerType: "40ft", containerValue: 28000, containerNumber: "MSKU4829104", origin: "Pakistan", portOfLoading: "Port Qasim", destination: "UAE", portOfDischarge: "Jebel Ali Port", destinationCountry: "UAE", destinationFlag: "🇦🇪",
    fundingDeadlineDate: "2026-07-15", minInvestment: 100, maxInvestment: null,
    currentFunding: 19600, targetFunding: 28000, totalInvestors: 47, totalAmountInvested: 19600, expectedReturnPct: 8.5, investmentPeriodDays: 45,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png", riskLevel: "low",
    productCategory: "Rice", description: "Export of premium 1121 Basmati Rice to a verified distributor in Dubai. The shipment is fully insured and backed by a confirmed letter of credit.",
    incoterm: "CIF", paymentTerms: "LC at sight",
    shippingLine: "Maersk", vesselName: "Maersk Kinloss", estimatedDepartureDate: "2026-07-20", estimatedArrivalDate: "2026-07-28",
    expectedProjectCompletionDate: "2026-08-15", currentProjectStage: "Funding"
  },
  {
    id: "cnt-002", slug: "yellow-corn-jakarta", commodity: "Yellow Corn", variety: "US Grade 2",
    tradeDirection: "export",
    containerType: "40ft", containerValue: 22000, containerNumber: "CMAU1284930", origin: "Pakistan", portOfLoading: "Karachi Port", destination: "Indonesia", portOfDischarge: "Tanjung Priok", destinationCountry: "Indonesia", destinationFlag: "🇮🇩",
    fundingDeadlineDate: "2026-07-12", minInvestment: 200, maxInvestment: null,
    currentFunding: 22000, targetFunding: 22000, totalInvestors: 38, totalAmountInvested: 22000, expectedReturnPct: 7.2, investmentPeriodDays: 35,
    status: "funded", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.21.23_PM_1775121609954-BKindUe0.png", riskLevel: "low",
    productCategory: "Grains", description: "Bulk shipment of yellow corn for animal feed to Jakarta. Trade is fully funded and preparing for vessel loading.",
    incoterm: "FOB", paymentTerms: "TT",
    shippingLine: "CMA CGM", expectedProjectCompletionDate: "2026-08-25", currentProjectStage: "Awaiting Vessel"
  },
  {
    id: "cnt-003", slug: "sesame-seeds-rotterdam", commodity: "Sesame Seeds", variety: "White Hulled 99.9%",
    tradeDirection: "export",
    containerType: "20ft", containerValue: 18000, containerNumber: "HLBU9283741", origin: "Pakistan", portOfLoading: "Port Qasim", destination: "Netherlands", portOfDischarge: "Port of Rotterdam", destinationCountry: "Netherlands", destinationFlag: "🇳🇱",
    fundingDeadlineDate: "2026-07-18", minInvestment: 500, maxInvestment: null,
    currentFunding: 9000, targetFunding: 18000, totalInvestors: 14, totalAmountInvested: 9000, expectedReturnPct: 9.8, investmentPeriodDays: 60,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.23.37_PM_1775121609954-DNoD5JGC.png", riskLevel: "medium",
    productCategory: "Seeds", description: "High-grade hulled sesame seeds destined for European food processors. Higher margin due to premium European market pricing.",
    incoterm: "CIF", paymentTerms: "LC 30 Days",
    expectedProjectCompletionDate: "2026-09-30", currentProjectStage: "Funding"
  },
  {
    id: "cnt-004", slug: "irri-6-rice-mombasa", commodity: "IRRI-6 Rice", variety: "IRRI-6 Long Grain",
    tradeDirection: "export",
    containerType: "40ft", containerValue: 19500, containerNumber: "MSC4928173", origin: "Pakistan", portOfLoading: "Karachi Port", destination: "Kenya", portOfDischarge: "Port of Mombasa", destinationCountry: "Kenya", destinationFlag: "🇰🇪",
    fundingDeadlineDate: "2026-07-20", minInvestment: 100, maxInvestment: null,
    currentFunding: 14625, targetFunding: 19500, totalInvestors: 29, totalAmountInvested: 14625, expectedReturnPct: 8.0, investmentPeriodDays: 40,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-04-02_at_5.57.43_PM_1775136600496-DgD1Xuwz.png", riskLevel: "low",
    productCategory: "Rice", description: "High-volume IRRI-6 white rice shipment to East Africa. Consistent demand and fast turnaround make this a reliable low-risk container.",
    incoterm: "CNF", paymentTerms: "TT",
    expectedProjectCompletionDate: "2026-09-01", currentProjectStage: "Funding"
  },
  {
    id: "cnt-005", slug: "iqf-potato-riyadh", commodity: "IQF Potato Sticks", variety: "Premium IQF 6mm",
    tradeDirection: "export",
    containerType: "40ft reefer", containerValue: 32000, containerNumber: "SUDU8472910", origin: "Pakistan", portOfLoading: "Port Qasim", destination: "Saudi Arabia", portOfDischarge: "Jeddah Islamic Port", destinationCountry: "Saudi Arabia", destinationFlag: "🇸🇦",
    fundingDeadlineDate: "2026-07-10", minInvestment: 250, maxInvestment: null,
    currentFunding: 32000, targetFunding: 32000, totalInvestors: 61, totalAmountInvested: 32000, expectedReturnPct: 11.2, investmentPeriodDays: 30,
    status: "shipping", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png", riskLevel: "medium",
    productCategory: "Processed Food", description: "Frozen french fries in a 40ft reefer destined for a major fast-food distributor in Riyadh. Container is currently on the water.",
    incoterm: "CIF", paymentTerms: "LC at sight",
    shippingLine: "Hamburg Süd", vesselName: "San Christobal", estimatedDepartureDate: "2026-07-12", estimatedArrivalDate: "2026-07-22",
    expectedProjectCompletionDate: "2026-08-10", currentProjectStage: "In Transit"
  },
  {
    id: "cnt-006", slug: "yellow-corn-lagos", commodity: "Yellow Corn", variety: "Grade 1 Yellow",
    tradeDirection: "export",
    containerType: "40ft", containerValue: 21000, containerNumber: "ZCSU2839401", origin: "Pakistan", portOfLoading: "Karachi Port", destination: "Nigeria", portOfDischarge: "Apapa Port", destinationCountry: "Nigeria", destinationFlag: "🇳🇬",
    fundingDeadlineDate: "2026-06-01", minInvestment: 100, maxInvestment: null,
    currentFunding: 21000, targetFunding: 21000, totalInvestors: 42, totalAmountInvested: 21000, expectedReturnPct: 7.8, investmentPeriodDays: 45,
    status: "completed", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.21.23_PM_1775121609954-BKindUe0.png", riskLevel: "low",
    productCategory: "Grains", description: "Yellow corn shipment to West Africa. Successfully completed and all returns have been distributed to investors.",
    incoterm: "CNF", paymentTerms: "TT",
    shippingLine: "ZIM", vesselName: "ZIM Luanda", estimatedDepartureDate: "2026-06-10", estimatedArrivalDate: "2026-07-05",
    expectedProjectCompletionDate: "2026-07-15", currentProjectStage: "Completed & Settled"
  },
  {
    id: "cnt-007", slug: "fresh-mangoes-doha", commodity: "Fresh Mangoes", variety: "Sindhri Mango",
    tradeDirection: "export",
    containerType: "20ft reefer", containerValue: 15000, containerNumber: "APLU9482710", origin: "Pakistan", portOfLoading: "Karachi Port", destination: "Qatar", portOfDischarge: "Hamad Port", destinationCountry: "Qatar", destinationFlag: "🇶🇦",
    fundingDeadlineDate: "2026-07-16", minInvestment: 200, maxInvestment: null,
    currentFunding: 3750, targetFunding: 15000, totalInvestors: 9, totalAmountInvested: 3750, expectedReturnPct: 13.5, investmentPeriodDays: 21,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png", riskLevel: "high",
    productCategory: "Fresh Produce", description: "Perishable fresh mangoes shipped in a reefer container. Fast turnaround of 21 days but carries higher spoilage risk, offset by higher returns.",
    incoterm: "CIF", paymentTerms: "TT",
    expectedProjectCompletionDate: "2026-08-10", currentProjectStage: "Funding"
  },
  {
    id: "cnt-008", slug: "basmati-kainat-kl", commodity: "Premium Basmati Rice", variety: "Kainat Basmati",
    tradeDirection: "export",
    containerType: "40ft", containerValue: 26000, containerNumber: "ONEY1829402", origin: "Pakistan", portOfLoading: "Port Qasim", destination: "Malaysia", portOfDischarge: "Port Klang", destinationCountry: "Malaysia", destinationFlag: "🇲🇾",
    fundingDeadlineDate: "2026-07-22", minInvestment: 100, maxInvestment: null,
    currentFunding: 15600, targetFunding: 26000, totalInvestors: 33, totalAmountInvested: 15600, expectedReturnPct: 8.2, investmentPeriodDays: 50,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png", riskLevel: "low",
    productCategory: "Rice", description: "Premium Kainat Basmati export to a long-term Malaysian partner. Steady, low-risk trade with predictable margins.",
    incoterm: "FOB", paymentTerms: "LC 30 Days",
    expectedProjectCompletionDate: "2026-09-15", currentProjectStage: "Funding"
  },
  // ── IMPORT CONTAINERS ────────────────────────────────────────────────────
  {
    id: "cnt-009", slug: "kiremko-processing-line-import", commodity: "IQF Processing Machinery", variety: "Kiremko BV Equipment",
    tradeDirection: "import",
    containerType: "40ft", containerValue: 45000, containerNumber: "MSDU7392011", origin: "Netherlands", portOfLoading: "Port of Rotterdam", destination: "Pakistan", portOfDischarge: "Port Qasim", destinationCountry: "Pakistan", destinationFlag: "🇵🇰",
    fundingDeadlineDate: "2026-07-28", minInvestment: 500, maxInvestment: null,
    currentFunding: 22500, targetFunding: 45000, totalInvestors: 18, totalAmountInvested: 22500, expectedReturnPct: 10.5, investmentPeriodDays: 55,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.23.37_PM_1775121609954-DNoD5JGC.png", riskLevel: "low",
    productCategory: "Industrial Equipment",
    description: "Import of a Kiremko IQF processing line from the Netherlands for the Potato Processing Plant in Depalpur. Funding the machinery import directly reduces plant commissioning time and investor returns are secured against the equipment value.",
    incoterm: "CIF", paymentTerms: "LC at sight",
    shippingLine: "Hapag-Lloyd", vesselName: "HL Rotterdam", estimatedDepartureDate: "2026-08-05", estimatedArrivalDate: "2026-09-10",
    expectedProjectCompletionDate: "2026-09-30", currentProjectStage: "Funding"
  },
  {
    id: "cnt-010", slug: "bulk-spices-import-karachi", commodity: "Bulk Spice Blends", variety: "Mixed Spice Raw Material",
    tradeDirection: "import",
    containerType: "20ft", containerValue: 17500, containerNumber: "CMAU4839102", origin: "India", portOfLoading: "Nhava Sheva Port", destination: "Pakistan", portOfDischarge: "Karachi Port", destinationCountry: "Pakistan", destinationFlag: "🇵🇰",
    fundingDeadlineDate: "2026-07-25", minInvestment: 200, maxInvestment: null,
    currentFunding: 8750, targetFunding: 17500, totalInvestors: 12, totalAmountInvested: 8750, expectedReturnPct: 9.0, investmentPeriodDays: 40,
    status: "open", imageUrl: "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png", riskLevel: "medium",
    productCategory: "Spices & Raw Materials",
    description: "Import of bulk raw spice materials from India for value-added re-export processing. The blended and packaged product is subsequently exported to GCC and European markets at a significant markup, generating strong trade margins for investors.",
    incoterm: "FOB", paymentTerms: "TT",
    shippingLine: "COSCO", estimatedDepartureDate: "2026-07-30", estimatedArrivalDate: "2026-08-08",
    expectedProjectCompletionDate: "2026-09-15", currentProjectStage: "Funding"
  },
];

export interface LongTermProject {
  id: string | number; slug: string; name: string;
  category: 'fresh-produce' | 'processing' | 'feed' | 'rice-mill' | 'cold-storage' | 'domestic-trading' | 'infrastructure';
  shortDescription: string; fullDescription: string;
  fundingTarget: number | null; currentFunding: number | null; minInvestment: number | null; maxInvestment: number | null;
  investmentPeriodMonths: number | null; expectedReturnPct: number | null; // annual
  investmentPeriodDays?: number | null;
  fundingPercentage?: number | null; remainingAmount?: number | null;
  expectedCompletionDate: string;
  riskLevel?: 'low' | 'medium' | 'high'; status: 'open' | 'funded' | 'in-progress' | 'completed';
  totalInvestors: number | null; imageUrls: string[];
  currency?: string;
  highlights: string[];
  documents: Array<{ name: string; type: string; size: string }>;
}

export const LONG_TERM_PROJECTS: LongTermProject[] = [
  {
    id: "prj-001", slug: "fresh-fv-market-investment", name: "Fresh Fruits & Vegetables Market Investment",
    category: "fresh-produce",
    shortDescription: "Co-invest in OG Exports' dedicated Fresh F&V procurement, processing, and export operation — a high-demand, seasonal business with consistent annual returns.",
    fullDescription: "This investment covers the operational capital for OG Exports' Fresh Fruits & Vegetables division. Pakistan is one of the world's top producers of mangoes, citrus, potatoes, and onions. By investing in this division, you fund the procurement of fresh produce at peak-season low prices, the cold-chain processing and packing operations, and the export logistics to GCC, European, and Southeast Asian buyers. Returns are generated from the export margin realized when buyers take delivery. The seasonal model runs three cycles annually, with capital recycled across each cycle to maximize returns.",
    fundingTarget: 600000, currentFunding: 390000, minInvestment: 5000, maxInvestment: 200000,
    investmentPeriodMonths: 24, expectedReturnPct: 14, expectedCompletionDate: "2028-06-01",
    riskLevel: "medium", status: "open", totalInvestors: 31,
    imageUrls: ["https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png"],
    highlights: [
      "3 harvest cycles per year — mango, citrus & potato seasons",
      "Cold-chain procurement from Punjab & Sindh farms",
      "Active export contracts with UAE, Saudi, and UK buyers",
      "Quality-certified packing facility in Depalpur",
      "14% projected annual return on invested capital"
    ],
    documents: [
      { name: "F&V Division Business Plan", type: "PDF", size: "3.8 MB" },
      { name: "Financial Projections (3-Year)", type: "XLSX", size: "1.4 MB" },
      { name: "Export Contracts Summary", type: "PDF", size: "2.1 MB" }
    ]
  },
  {
    id: "prj-002", slug: "potato-processing-plant", name: "Potato Processing Plant Investment",
    category: "processing",
    shortDescription: "Fund the construction and commissioning of a state-of-the-art IQF potato processing facility in Punjab — capturing the $4B+ GCC and European frozen food market.",
    fullDescription: "OG Exports is constructing a dedicated Individually Quick Frozen (IQF) potato processing plant in Depalpur, Punjab. The plant will wash, slice, blanch, and flash-freeze fresh potatoes into export-grade french fries, cubes, and wedges. Pakistan grows some of the world's best processing potatoes — low moisture, high solid content — at a fraction of European sourcing cost. The GCC fast food market alone imports $900M+ of frozen potato products annually, currently dominated by European and Egyptian suppliers. This plant positions OG Exports to capture a significant share with competitive pricing. The investment covers land, civil works, European processing machinery, and working capital for the first year of production.",
    fundingTarget: 850000, currentFunding: 297500, minInvestment: 10000, maxInvestment: 250000,
    investmentPeriodMonths: 48, expectedReturnPct: 18, expectedCompletionDate: "2028-12-01",
    riskLevel: "medium", status: "open", totalInvestors: 19,
    imageUrls: ["https://ogexports.co/assets/Screenshot_2026-03-04_at_10.23.37_PM_1775121609954-DNoD5JGC.png"],
    highlights: [
      "25 MT/day IQF processing capacity at full output",
      "European Kiremko processing line (Netherlands)",
      "GCC & EU export-ready packaging and cold chain",
      "$4B+ addressable frozen potato market in GCC/EU",
      "18% projected annual return over 4-year horizon",
      "Quality certification planned pre-launch"
    ],
    documents: [
      { name: "Plant Feasibility Study", type: "PDF", size: "5.2 MB" },
      { name: "Financial Model (4-Year)", type: "XLSX", size: "2.3 MB" },
      { name: "Equipment Quotation — Kiremko BV", type: "PDF", size: "1.8 MB" },
      { name: "Land Acquisition Documents", type: "PDF", size: "3.1 MB" }
    ]
  }
];

export const INVESTOR_PORTFOLIO = {
  totalValue: 34750, available: 8200, locked: 12050, invested: 14500,
  totalDeposited: 40000, totalWithdrawn: 5250, expectedReturns: 2890,
  totalInvestments: 7, activeInvestments: 4, completedInvestments: 2, pendingInvestments: 1,
  monthlyData: [
    { month: 'Jan', value: 22000, invested: 18000, returns: 1200 },
    { month: 'Feb', value: 24500, invested: 19500, returns: 1350 },
    { month: 'Mar', value: 26000, invested: 21000, returns: 1520 },
    { month: 'Apr', value: 27800, invested: 22000, returns: 1680 },
    { month: 'May', value: 30200, invested: 24500, returns: 1890 },
    { month: 'Jun', value: 32000, invested: 25500, returns: 2100 },
    { month: 'Jul', value: 34750, invested: 26500, returns: 2890 },
  ],
  commodityAllocation: [
    { name: 'Basmati Rice', value: 12000, color: '#10b981' },
    { name: 'Corn', value: 7500, color: '#f59e0b' },
    { name: 'Sesame Seeds', value: 5500, color: '#6366f1' },
    { name: 'IQF Potato', value: 4500, color: '#ec4899' },
    { name: 'Long-Term Projects', value: 5250, color: '#8b5cf6' },
  ],
  activeHoldings: [
    { id: 'inv-001', type: 'container', refId: 'cnt-001', name: 'Basmati Rice → Dubai', amount: 5000, returnPct: 8.5, daysLeft: 28, status: 'active', expectedReturn: 425 },
    { id: 'inv-002', type: 'container', refId: 'cnt-005', name: 'IQF Potato → Riyadh', amount: 3500, returnPct: 11.2, daysLeft: 14, status: 'shipping', expectedReturn: 392 },
    { id: 'inv-003', type: 'project', refId: 'prj-002', name: 'Potato Processing Plant', amount: 4000, returnPct: 18, daysLeft: 540, status: 'active', expectedReturn: 2160 },
    { id: 'inv-004', type: 'container', refId: 'cnt-004', name: 'IRRI-6 Rice → Mombasa', amount: 2000, returnPct: 8.0, daysLeft: 31, status: 'active', expectedReturn: 160 },
  ],
};

export const MOCK_TRANSACTIONS = [
  { id: 'txn-001', type: 'deposit', amount: 15000, status: 'approved', date: '2026-01-15', description: 'Bank transfer deposit', ref: 'DEP-20260115-001' },
  { id: 'txn-002', type: 'investment', amount: -5000, status: 'completed', date: '2026-01-18', description: 'Investment: Basmati Rice → Dubai', ref: 'INV-CNT001-001' },
  { id: 'txn-003', type: 'deposit', amount: 10000, status: 'approved', date: '2026-02-05', description: 'Bank transfer deposit', ref: 'DEP-20260205-001' },
  { id: 'txn-004', type: 'investment', amount: -3500, status: 'completed', date: '2026-02-10', description: 'Investment: IQF Potato → Riyadh', ref: 'INV-CNT005-001' },
  { id: 'txn-005', type: 'return', amount: 1200, status: 'completed', date: '2026-03-02', description: 'Investment return: IRRI-6 Rice → Nairobi', ref: 'RET-CNT003-001' },
  { id: 'txn-006', type: 'deposit', amount: 8000, status: 'approved', date: '2026-03-20', description: 'Bank transfer deposit', ref: 'DEP-20260320-001' },
  { id: 'txn-007', type: 'investment', amount: -4000, status: 'completed', date: '2026-03-25', description: 'Investment: Potato Processing Plant', ref: 'INV-PRJ002-001' },
  { id: 'txn-008', type: 'withdrawal', amount: -5250, status: 'completed', date: '2026-04-10', description: 'Withdrawal to HBL account ending 3456', ref: 'WDR-20260410-001' },
  { id: 'txn-009', type: 'deposit', amount: 7000, status: 'approved', date: '2026-05-01', description: 'Bank transfer deposit', ref: 'DEP-20260501-001' },
  { id: 'txn-010', type: 'investment', amount: -2000, status: 'completed', date: '2026-05-05', description: 'Investment: IRRI-6 Rice → Mombasa', ref: 'INV-CNT004-001' },
  { id: 'txn-011', type: 'return', amount: 1690, status: 'completed', date: '2026-06-15', description: 'Investment return: Basmati Rice cycle', ref: 'RET-CNT001-001' },
  { id: 'txn-012', type: 'deposit', amount: 7000, status: 'pending', date: '2026-07-08', description: 'Bank transfer deposit — pending approval', ref: 'DEP-20260708-001' },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'deposit_approved', title: 'Deposit Approved', message: 'Your deposit of $7,000 has been approved and credited to your wallet.', createdAt: '2026-07-08T00:00:00Z', read: false },
  { id: 'n2', type: 'investment_return', title: 'Investment Return Received', message: '$1,690 return credited from Basmati Rice container investment.', createdAt: '2026-06-15T00:00:00Z', read: false },
  { id: 'n3', type: 'investment_approved', title: 'Investment Activated', message: 'Your $3,500 investment in IQF Potato → Riyadh is now active. Container is shipping.', createdAt: '2026-02-11T00:00:00Z', read: true },
  { id: 'n4', type: 'withdrawal_approved', title: 'Withdrawal Processed', message: 'Withdrawal of $5,250 has been sent to your HBL account ending 3456.', createdAt: '2026-04-11T00:00:00Z', read: true },
  { id: 'n5', type: 'admin_announcement', title: 'New Document Available', message: 'Investment Agreement for Potato Processing Plant (PRJ-002) is ready to download.', createdAt: '2026-03-26T00:00:00Z', read: true },
  { id: 'n6', type: 'admin_announcement', title: 'Project Update: Potato Processing Plant', message: 'Site preparation and foundation work has commenced. On track for Q4 2028 commissioning.', createdAt: '2026-06-01T00:00:00Z', read: true },
  { id: 'n7', type: 'deposit_approved', title: 'Deposit Received', message: 'Your deposit of $8,000 has been received and is pending approval.', createdAt: '2026-03-20T00:00:00Z', read: true },
];
