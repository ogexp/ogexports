/**
 * Static product catalog — sourced from ogexports.co
 * Full data for product detail pages (no API dependency).
 */
export interface StaticProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  origin: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  galleryUrls?: string[];
  videoUrl?: string;
  featured: boolean;
  supplier: { displayName: string; entityType: "company"; verified: true };
  specs: { label: string; value: string }[];
  paymentTerms: string[];
  deliveryTerms: string[];
  packagingOptions: string[];
  certifications: string[];
  moq: string;
  leadTime: string;
  hsCode: string;
  shelfLife?: string;
  storageInstructions?: string;
  exportMarkets: string[];
}

export const STATIC_PRODUCTS: StaticProduct[] = [
  {
    id: "1",
    slug: "premium-basmati-rice",
    name: "Premium Basmati Rice",
    category: "Rice",
    origin: "Pakistan",
    shortDescription:
      "Export-grade Super Basmati / 1121 variety. Long-grain, aromatic, and aged for superior quality. Serving buyers across the Middle East, Europe, and Asia.",
    description:
      "OG Exports sources Premium Basmati Rice directly from the fertile rice belt of Punjab, Pakistan — the heartland of world-class Basmati cultivation. Our Super Basmati and 1121 varieties are selected at harvest, milled to export grade, and aged a minimum of 12 months for enhanced aroma and elongation.\n\nEvery lot is tested at a PCSIR-accredited laboratory for moisture, broken content, foreign matter, and grain length before loading. Shipments are issued with a COA (Certificate of Analysis), Phytosanitary Certificate, and Fumigation Certificate. We ship in 20ft and 40ft containers — typically 25 MT per 20ft — with sea freight to all major global ports.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png",
    galleryUrls: [
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png",
      "https://ogexports.co/assets/Screenshot_2026-04-02_at_5.57.43_PM_1775136600496-DgD1Xuwz.png",
    ],
    featured: true,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Variety", value: "Super Basmati / 1121" },
      { label: "Grain Length (raw)", value: "8.30 mm Min" },
      { label: "Grain Length (cooked)", value: "18–20 mm" },
      { label: "Broken", value: "5% / 10% (customizable)" },
      { label: "Moisture", value: "14% Max" },
      { label: "Foreign Matter", value: "0.1% Max" },
      { label: "Grade", value: "Export Grade A+" },
      { label: "Aging", value: "12 Months Minimum" },
      { label: "Milling", value: "Double Sortex" },
      { label: "Aroma", value: "Natural / 2-AP Certified" },
    ],
    paymentTerms: ["LC at Sight", "SBLC", "TT (30% advance)"],
    deliveryTerms: ["FOB Karachi / Port Qasim", "CIF", "CFR", "EXW"],
    packagingOptions: ["1 KG", "2 KG", "5 KG", "10 KG", "25 KG", "50 KG", "Private Label / OEM"],
    certifications: ["SECP Registered", "Quality Assured", "Lab Tested", "Phytosanitary", "COA (PCSIR Lab)"],
    moq: "1 × 20ft Container (~25 MT)",
    leadTime: "7–14 Business Days",
    hsCode: "1006.30",
    shelfLife: "24 months from milling date",
    storageInstructions: "Cool, dry place — away from direct sunlight and moisture",
    exportMarkets: ["UAE", "Saudi Arabia", "UK", "Netherlands", "Malaysia", "Kenya", "USA"],
  },
  {
    id: "2",
    slug: "irri-6-rice",
    name: "IRRI-6 Rice",
    category: "Rice",
    origin: "Pakistan",
    shortDescription:
      "Long Grain IRRI-6 rice — affordable, high-yield, and perfectly suited for large-volume food-service and processing markets worldwide.",
    description:
      "IRRI-6 is Pakistan's most widely exported commercial rice variety. Known for its long grain, low broken content, and excellent cooking yield, IRRI-6 is a staple in food-service operations, government procurement programs, and institutional buyers across Africa, the Middle East, and Southeast Asia.\n\nOG Exports mills and sorts IRRI-6 at our dedicated processing facility in Depalpur, Punjab. The rice is double-sortexed, fumigated, and loaded into 40ft containers with full trade documentation. Custom broken percentages (5%, 10%, 25%) are available to match your market requirements.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-04-02_at_5.57.43_PM_1775136600496-DgD1Xuwz.png",
    featured: false,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Variety", value: "Long Grain IRRI-6" },
      { label: "Broken", value: "5% / 10% / 25%" },
      { label: "Moisture", value: "14% Max" },
      { label: "Foreign Matter", value: "0.2% Max" },
      { label: "Grade", value: "Export Grade B / Commercial" },
      { label: "Milling", value: "Single / Double Sortex" },
      { label: "Average Grain Length", value: "6.5 mm" },
    ],
    paymentTerms: ["LC at Sight", "TT"],
    deliveryTerms: ["FOB Karachi", "CIF", "CNF"],
    packagingOptions: ["25 KG", "50 KG", "Jumbo Bags (1 MT)", "Private Label"],
    certifications: ["SECP Registered", "Phytosanitary", "Fumigation Certificate", "COA"],
    moq: "1 × 40ft Container (~27 MT)",
    leadTime: "5–10 Business Days",
    hsCode: "1006.30",
    shelfLife: "24 months",
    storageInstructions: "Cool, dry — relative humidity below 70%",
    exportMarkets: ["Nigeria", "Ghana", "Indonesia", "Sri Lanka", "Kenya", "Iraq"],
  },
  {
    id: "3",
    slug: "yellow-corn",
    name: "Yellow Maize (Yellow Corn)",
    category: "Grains",
    origin: "Pakistan",
    shortDescription:
      "Premium yellow corn for animal feed, food processing, and industrial use. Consistent quality, low moisture, low broken — shipped in bulk or bags.",
    description:
      "Yellow Maize (Yellow Corn) from Pakistan is one of the most cost-competitive grains on the global market. OG Exports sources from major corn-producing districts in Punjab and KPK, with consistent quality across each harvest season.\n\nOur yellow corn is commonly used for animal feed formulation, corn milling (flour, starch, glucose syrup), poultry and aquaculture feed, and biofuel. We can supply in polypropylene bags (25 KG / 50 KG) or bulk container loads. Each shipment is issued with an Aflatoxin test report and COA from an accredited laboratory.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.21.23_PM_1775121609954-BKindUe0.png",
    featured: true,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Type", value: "Yellow Corn (Maize)" },
      { label: "Moisture", value: "14% Max" },
      { label: "Broken / Damaged", value: "3% Max" },
      { label: "Foreign Matter", value: "1% Max" },
      { label: "Aflatoxin", value: "≤ 10 ppb (EU standard)" },
      { label: "Test Weight", value: "72 kg/hl Min" },
      { label: "Grade", value: "Animal Feed / Milling Grade" },
    ],
    paymentTerms: ["LC at Sight", "SBLC", "TT"],
    deliveryTerms: ["FOB Karachi Port", "CIF", "CNF", "EXW"],
    packagingOptions: ["25 KG PP Bag", "50 KG PP Bag", "Bulk Container"],
    certifications: ["SECP Registered", "Aflatoxin Test Report", "COA (Accredited Lab)", "Phytosanitary"],
    moq: "1 × 40ft Container (~27 MT)",
    leadTime: "7–12 Business Days",
    hsCode: "1005.90",
    shelfLife: "12 months from dispatch",
    storageInstructions: "Dry warehouse — temperature below 25°C, humidity below 65%",
    exportMarkets: ["Indonesia", "Malaysia", "Vietnam", "Nigeria", "UAE", "Bangladesh"],
  },
  {
    id: "4",
    slug: "sesame-seeds",
    name: "Sesame Seeds",
    category: "Seeds & Oilseeds",
    origin: "Pakistan",
    shortDescription:
      "Natural and hulled sesame seeds with 99.5%+ purity. Exported to food manufacturers, oil processors, and specialty retailers globally.",
    description:
      "Pakistan is among the world's top producers of high-quality sesame seeds, cultivated primarily in Sindh and Punjab provinces. OG Exports supplies both Natural (unhulled) and Hulled (white) sesame seeds — sorted by optical sortex machines to achieve 99.5%+ purity with minimal foreign matter.\n\nOur sesame seeds are widely used in bakery (bread, buns, crackers), confectionery (tahini, halva), sesame oil pressing, and specialty food products. European and North American food manufacturers prefer our Hulled variety for its clean white colour, high oil content (50–55%), and consistent quality. Each lot is tested for Salmonella, aflatoxin, pesticide residues, and heavy metals.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.23.37_PM_1775121609954-DNoD5JGC.png",
    featured: true,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Variety", value: "Natural (Unhulled) / Hulled (White)" },
      { label: "Purity", value: "99.5% Min" },
      { label: "Moisture", value: "6% Max" },
      { label: "Oil Content", value: "50–55%" },
      { label: "Foreign Matter", value: "0.1% Max" },
      { label: "Acid Value", value: "≤ 2 mg KOH/g" },
      { label: "Salmonella", value: "Absent (per 25g)" },
      { label: "Aflatoxin", value: "≤ 10 ppb" },
      { label: "Colour (Hulled)", value: "Cream White — uniform" },
    ],
    paymentTerms: ["LC at Sight", "LC 30 Days", "SBLC", "TT"],
    deliveryTerms: ["FOB Port Qasim", "CIF", "CFR", "Air Shipment"],
    packagingOptions: ["25 KG PP Bag", "50 KG PP Bag", "Private Label"],
    certifications: ["SECP Registered", "Quality Assured", "Lab Tested", "Halal Certified", "Salmonella / Pesticide Free Lab Report"],
    moq: "1 × 20ft Container (~20 MT)",
    leadTime: "10–14 Business Days",
    hsCode: "1207.40",
    shelfLife: "18 months in cool, dry storage",
    storageInstructions: "Cool, dry — max 25°C, humidity below 60%",
    exportMarkets: ["Netherlands", "Germany", "Japan", "South Korea", "USA", "UAE", "Turkey"],
  },
  {
    id: "5",
    slug: "fresh-mangoes",
    name: "Fresh Mangoes",
    category: "Fresh Produce",
    origin: "Pakistan",
    shortDescription:
      "Pakistan's world-famous Sindhri and Chaunsa mangoes — hand-picked at peak ripeness, phytosanitary certified, and air/sea-freighted to global importers.",
    description:
      "Pakistan produces some of the world's most prized mango varieties. OG Exports works directly with orchards in Sindh and Punjab to source Sindhri, Chaunsa, and Langra mangoes during peak season (May–August). Fruit is hand-selected at optimal brix levels, ethylene-treated for shelf life, and packed in export cartons.\n\nAll export consignments carry a Phytosanitary Certificate issued by Pakistan's Department of Plant Protection. We can arrange sea-reefer shipment or air freight depending on buyer's delivery requirements. Cold-chain documentation is provided end-to-end.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png",
    featured: false,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Varieties", value: "Sindhri / Chaunsa / Langra" },
      { label: "Season", value: "May – August" },
      { label: "Brix Level", value: "18–22°" },
      { label: "Size", value: "200g–450g per fruit" },
      { label: "Packaging", value: "2 KG / 5 KG export cartons" },
    ],
    paymentTerms: ["LC", "TT (50% advance)"],
    deliveryTerms: ["FOB Karachi", "CIF", "Air Freight"],
    packagingOptions: ["2 KG Carton", "5 KG Carton", "Custom Retail Pack"],
    certifications: ["Phytosanitary Certificate", "Pesticide Residue Test", "Lab Tested"],
    moq: "1 × 20ft Reefer (~10 MT)",
    leadTime: "3–7 Days (seasonal)",
    hsCode: "0804.50",
    shelfLife: "21–28 days at 10°C",
    storageInstructions: "Reefer storage at 10–12°C",
    exportMarkets: ["UAE", "UK", "Germany", "France", "Canada", "Qatar"],
  },
  {
    id: "6",
    slug: "fresh-vegetables",
    name: "Fresh Vegetables",
    category: "Fresh Produce",
    origin: "Pakistan",
    shortDescription:
      "Seasonal and year-round fresh vegetables sourced from Punjab's fertile farms — chilies, onions, garlic, potatoes — export-washed and packed to specification.",
    description:
      "Pakistan's agricultural heartland — Punjab and Sindh — supplies a wide variety of fresh vegetables year-round. OG Exports sources fresh onions, garlic, green chilies, potatoes, and seasonal vegetables directly from farm clusters and supply chains vetted for quality compliance.\n\nAll consignments are field-graded, washed, and packed at our facility in Depalpur before dispatch to Port Qasim or Karachi. Phytosanitary inspection and documentation is handled in-house. Custom packaging is available for supermarket buyers.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.20.16_PM_1775121609953--GHDzNET.png",
    featured: false,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Types", value: "Onions, Garlic, Potatoes, Green Chilies" },
      { label: "Grade", value: "Export Grade A" },
      { label: "Certifications", value: "Phytosanitary Certificate" },
      { label: "Season", value: "Year-round (varies by type)" },
    ],
    paymentTerms: ["LC", "TT"],
    deliveryTerms: ["FOB Karachi", "CIF", "CFR"],
    packagingOptions: ["10 KG Mesh Bag", "20 KG Mesh Bag", "50 KG Bag", "Custom"],
    certifications: ["Phytosanitary Certificate", "SECP Registered"],
    moq: "1 × 20ft Container",
    leadTime: "5–10 Business Days",
    hsCode: "0703 / 0714",
    shelfLife: "21–45 days (type-dependent)",
    storageInstructions: "Cool dry warehouse or reefer depending on type",
    exportMarkets: ["UAE", "Bahrain", "Oman", "Malaysia", "UK"],
  },
  {
    id: "7",
    slug: "iqf-potato-sticks",
    name: "IQF Potato Sticks",
    category: "Processed Food",
    origin: "Pakistan",
    shortDescription:
      "Individually Quick Frozen (IQF) potato sticks — pre-cut, blanched, and frozen at source for food-service chains, retail private-label, and institutional buyers.",
    description:
      "OG Exports produces IQF (Individually Quick Frozen) potato sticks from high-solid, low-moisture Desiree and Lady Claire varieties grown in Punjab. The potatoes are washed, peeled, cut to specification (6mm, 9mm, or 12mm strips), blanched, dried, and blast-frozen at -35°C before packing.\n\nOur IQF potato sticks are used by quick-service restaurant chains, hotel kitchens, retail supermarkets (private label), and institutional food buyers across the GCC and Europe. Quality-certified production ensures full food safety compliance. Reefer shipment in 40ft containers.",
    imageUrl:
      "https://ogexports.co/assets/Screenshot_2026-03-04_at_10.23.37_PM_1775121609954-DNoD5JGC.png",
    featured: false,
    supplier: { displayName: "OG Exports (Pvt) Ltd", entityType: "company", verified: true },
    specs: [
      { label: "Process", value: "IQF (Individually Quick Frozen)" },
      { label: "Cut Size", value: "6mm / 9mm / 12mm strips" },
      { label: "Dry Matter", value: "21–23%" },
      { label: "Freezing Temp", value: "-35°C blast freeze" },
      { label: "Storage Temp", value: "-18°C" },
      { label: "Moisture Loss", value: "≤ 2% after frying" },
      { label: "Fat Content (pre-fry)", value: "0%" },
    ],
    paymentTerms: ["LC at Sight", "SBLC", "TT"],
    deliveryTerms: ["CIF", "CFR", "FOB Port Qasim"],
    packagingOptions: ["2.5 KG Retail Bag", "10 KG Master Carton", "20 KG Bulk", "Private Label"],
    certifications: ["Quality Assured", "Halal Certified", "EU Food Safety Compliant"],
    moq: "1 × 40ft Reefer Container",
    leadTime: "10–18 Business Days",
    hsCode: "2004.10",
    shelfLife: "24 months at -18°C",
    storageInstructions: "Maintain -18°C throughout cold chain",
    exportMarkets: ["Saudi Arabia", "UAE", "Kuwait", "UK", "Netherlands", "Germany"],
  },
];
