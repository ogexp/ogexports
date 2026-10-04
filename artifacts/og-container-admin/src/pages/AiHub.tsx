import { useState, useRef, useEffect } from "react"
import {
  MessageSquare, Search, FileText, ChevronDown, ChevronUp,
  Send, Bot, User, Sparkles, Printer, CheckCircle2, Circle,
  Hash, Globe, Package, Ship
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePageTitle } from "@/hooks/use-page-title"

// ─── AI RESPONSE TEMPLATES ────────────────────────────────────────────────────
const AI_RESPONSES: Record<string, string> = {
  price: `**Current OG Exports Price Intelligence** (indicative, updated weekly)\n\n• **Basmati Rice (Super Kernel):** USD 850–920/MT FOB Karachi\n• **Yellow Maize:** USD 230–260/MT FOB Karachi\n• **Sesame Seeds (White Hulled):** USD 1,400–1,550/MT FOB\n• **Fresh Mangoes (Sindhri):** USD 0.90–1.20/kg FOB\n• **Kinnow Mandarins:** USD 0.45–0.65/kg FOB\n\nPrices vary with grade, quantity, and Incoterms. Contact our sales desk for a firm quotation locked for 72 hours.`,

  rate: `**Exchange Rate & Freight Rate Overview**\n\n• **PKR/USD:** ~278–282 (check SBP for live rates)\n• **Karachi → Dubai (FCL 20ft):** USD 800–1,100\n• **Karachi → Rotterdam:** USD 2,200–2,800\n• **Karachi → Shanghai:** USD 1,400–1,800\n• **Air freight (food grade):** USD 2.20–3.50/kg\n\nRates fluctuate weekly. OG Exports can arrange freight; ask for a freight-inclusive **CIF** quote.`,

  document: `**Standard Export Document Checklist**\n\n1. **Commercial Invoice** – your company letterhead, HS codes, unit price\n2. **Packing List** – net/gross weight, carton count, dimensions\n3. **Bill of Lading** – issued by shipping line after loading\n4. **Certificate of Origin** – TDAP or Chamber of Commerce\n5. **Phytosanitary Certificate** – DPPD / Plant Protection Department\n6. **Fumigation Certificate** – for rice, maize, and grains\n7. **PSQCA Quality Certificate** – mandatory for food commodities\n\nFor EU/UK add: **HACCP, EUR.1 Form, Lab Analysis Report**.\nFor Gulf states add: **Halal Certificate** (for processed food).`,

  certificate: `**Certificates Required for Agricultural Exports from Pakistan**\n\n• **Phytosanitary Certificate** – Plant Protection Dept., 3–5 days, PKR 5,000–15,000\n• **Fumigation Certificate** – Licensed fumigators, 1–2 days\n• **PSQCA Certificate** – Pakistan Standards Authority, 5–7 days\n• **Halal Certificate** – PHDEC or approved body, 7–14 days\n• **Certificate of Origin** – TDAP / Chamber, 1–2 days\n• **EUR.1 Movement Certificate** – Customs, for EU GSP+\n• **HACCP / ISO 22000** – Third-party auditors, 2–4 weeks initial\n\nOG Exports assists buyers with documentation coordination at no extra charge.`,

  incoterm: `**Incoterms® 2020 — Quick Reference**\n\n**Sea & Inland Waterway Only:**\n• **FOB** – Seller loads vessel; buyer pays freight & insurance\n• **CIF** – Seller pays freight + insurance to destination port\n• **CFR** – Seller pays freight; buyer arranges insurance\n• **FAS** – Seller delivers alongside vessel\n\n**Any Mode of Transport:**\n• **EXW** – Buyer collects from seller's premises (maximum buyer risk)\n• **FCA** – Seller delivers to carrier nominated by buyer\n• **DAP** – Seller delivers to named place, duty unpaid\n• **DDP** – Seller delivers duty paid (maximum seller obligation)\n• **CIP / CPT / DPU** – Intermediate risk splits\n\nOG Exports most commonly quotes **FOB Karachi** and **CIF destination port**.`,

  "hs code": `**HS Code Lookup — Key Pakistan Agricultural Exports**\n\n| Product | HS Code | Notes |\n|---------|---------|-------|\n| Basmati Rice (Milled) | **1006.30** | Most exported variety |\n| Sesame Seeds | **1207.40** | White hulled, natural |\n| Yellow Maize | **1005.90** | Feed & food grade |\n| Fresh Mangoes | **0804.50** | Sindhri, Chaunsa |\n| Kinnow/Mandarins | **0805.20** | Nov–Feb season |\n| Wheat Flour | **1101.00** | Varies by protein % |\n| Chickpeas | **0713.20** | Desi & Kabuli |\n\nUse the **HS Code Finder** tab for our full database of 25 codes with export duty and market information.`,

  shipping: `**Shipping & Freight Information**\n\n**Main Ports:**\n• **Port Qasim, Karachi** – primary container port\n• **Karachi Port Trust** – bulk & break-bulk\n\n**Transit Times (approximate):**\n• Karachi → Dubai: 4–5 days\n• Karachi → Jeddah: 7–9 days\n• Karachi → Rotterdam: 22–26 days\n• Karachi → Shanghai: 16–20 days\n• Karachi → Mombasa: 12–15 days\n\n**Container Types:**\n• **20ft Standard** – ~25 MT rice, ~22 MT sesame\n• **40ft HC** – ~26 MT rice (over-weight risk; verify port limits)\n• **Reefer** – Fresh mangoes, citrus (0–4°C)\n\nLead time from order confirmation to vessel loading: **10–21 working days**.`,

  freight: `**Freight & Logistics at OG Exports**\n\nWe work with major shipping lines including **MSC, Evergreen, COSCO, and CMA CGM**.\n\n**Services offered:**\n• FOB booking (buyer's freight forwarder)\n• CIF/CFR arrangements (our nominated freight partner)\n• Reefer containers for perishables\n• Air freight for urgent or high-value consignments\n• Door-to-port inland haulage from farm/warehouse\n\n**Typical lead times:**\n• Booking confirmation: 2–3 days\n• Stuffing & loading: 3–7 days\n• Documentation issuance: 2–5 days after loading\n\nContact **exports@ogexports.com** for a freight quote.`,

  payment: `**Payment Terms Available at OG Exports**\n\n• **Letter of Credit (LC at Sight)** – Preferred for new buyers; most secure\n• **LC 30/60/90 days** – Available for established buyers with credit history\n• **Telegraphic Transfer (TT)** – 30–50% advance + balance against B/L copy\n• **Open Account** – Only for long-term partners with credit approval\n\n**Recommended for first orders:** LC at Sight confirmed by an international bank.\n\n**Banking:** We work with HBL, UBL, and Standard Chartered Pakistan for smooth LC negotiations.`,

  basmati: `**Basmati Rice — OG Exports Specifications**\n\n**Varieties Available:**\n• **Super Kernel Basmati** – Extra long grain, premium aroma, most exported\n• **PK-385** – Long grain, high yield, competitive pricing\n• **1121 Steam** – Extra-extra long, parboiled option available\n\n**Quality Grades:**\n• 2% Broken, 5% Broken, 25% Broken\n• Moisture: Max 13.5%\n• Foreign matter: Max 0.1%\n\n**Packaging:** 25kg PP bags, 50kg jute bags, 5kg/10kg retail packs (private label available)\n\n**Season:** October–February (new crop); year-round supply from stored stock\n\n**Markets:** UAE, Saudi Arabia, UK, EU, USA, Canada, Kenya\n\n**MOQ:** 1 × 20ft container (~25 MT)`,

  sesame: `**Sesame Seeds — OG Exports Specifications**\n\n**Types:**\n• **White Hulled Sesame** – 99.95% purity, for bakery/food use\n• **Natural (Unhulled) Sesame** – for oil pressing\n• **Black Sesame** – niche markets, Japan/Korea\n\n**Quality Parameters:**\n• Oil content: 48–52%\n• Moisture: Max 6%\n• Purity: 99.95% min (hulled), 99.50% (natural)\n• FFA: Max 1%\n\n**HS Code:** 1207.40\n\n**Packaging:** 25kg/50kg PP woven bags, bulk\n\n**Markets:** China, Japan, South Korea, EU, Middle East\n\n**MOQ:** 1 × 20ft container (~18–20 MT)\n\n**Certifications available:** Halal, Organic (on request), Kosher (on request)`,

  mango: `**Pakistani Mangoes — OG Exports**\n\n**Varieties:**\n• **Sindhri** – Sweet, fiberless, golden-yellow; May–June\n• **Chaunsa** – Premium aroma, late season; July–August\n• **Anwar Ratol** – Small, intensely sweet; July\n• **Langra** – Green skin, excellent flavor; June–July\n\n**Export Specifications:**\n• Grade A: 300–500g per fruit, free from blemishes\n• Cold chain: 12–14°C during transit\n• Packaging: 4–5kg cartons (cardboard), VHT treated for USA/Australia\n\n**HS Code:** 0804.50\n\n**Season:** May – August\n\n**Markets:** UAE, UK, Canada, Germany, Saudi Arabia\n\n**Requirements:** Phytosanitary certificate, fumigation (methyl bromide or VHT), cold chain logistics\n\n**MOQ:** 1 reefer container (5–8 MT for air, 12–18 MT reefer FCL)`,

  maize: `**Yellow Maize — OG Exports**\n\n**Product:** Yellow Maize / Corn (Feed & Food Grade)\n**HS Code:** 1005.90\n\n**Specifications:**\n• Moisture: Max 13.5%\n• Broken & damaged: Max 3%\n• Foreign matter: Max 1%\n• Aflatoxin: Max 10 ppb (EU: Max 4 ppb)\n• Test weight: Min 72 kg/hl\n\n**Packaging:** Bulk (vessel), 50kg PP bags\n\n**Season:** April–May and October–November (two crops)\n\n**Markets:** Malaysia, Indonesia, Vietnam, Philippines, Middle East, East Africa\n\n**Typical price:** USD 230–260/MT FOB Karachi\n\n**MOQ:** 500 MT (bulk), 1 container (25 MT bagged)\n\n**Uses:** Poultry feed, animal feed, starch manufacturing, human consumption`,

  moq: `**Minimum Order Quantities (MOQ) at OG Exports**\n\n| Product | MOQ | Container |\n|---------|-----|----------|\n| Basmati Rice | 25 MT | 1 × 20ft |\n| Sesame Seeds | 18 MT | 1 × 20ft |\n| Yellow Maize | 25 MT | 1 × 20ft |\n| Fresh Mangoes | 5 MT | Air / Reefer |\n| Kinnow | 10 MT | 1 × Reefer |\n| Wheat Flour | 25 MT | 1 × 20ft |\n| Spices (bulk) | 1 MT | Pallet/LCL |\n\nFor **samples**, we offer 5–50kg trial quantities against freight & handling costs.\n\nFor **LCL (Less than Container Load)**, we can consolidate with minimum 1 MT on most products.`,

  default: `**Welcome to OG Exports AI Trade Assistant**\n\nI can help you with:\n\n• **Pricing** – commodity prices, freight rates, quotations\n• **Documentation** – export certificates, LC requirements, customs docs\n• **Incoterms** – FOB, CIF, CFR, DAP explained\n• **HS Codes** – correct classification for Pakistani agricultural products\n• **Shipping** – transit times, ports, container types\n• **Payment Terms** – LC, TT options\n• **Products** – Basmati rice, sesame seeds, mangoes, maize specifications\n• **MOQ** – minimum order quantities and packaging\n\nTry asking: *"What documents do I need for UAE?"* or *"Current Basmati rice price?"*\n\n📧 For firm quotes: **exports@ogexports.com**`,
}

function getAiResponse(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("price") && !lower.includes("rate")) return AI_RESPONSES.price
  if (lower.includes("rate") || lower.includes("freight rate") || lower.includes("exchange")) return AI_RESPONSES.rate
  if (lower.includes("hs code") || lower.includes("hs-code") || lower.includes("tariff code")) return AI_RESPONSES["hs code"]
  if (lower.includes("incoterm") || lower.includes("fob") || lower.includes("cif") || lower.includes("ddp") || lower.includes("dap")) return AI_RESPONSES.incoterm
  if (lower.includes("document") || lower.includes("paperwork") || lower.includes("checklist")) return AI_RESPONSES.document
  if (lower.includes("certificate") || lower.includes("phyto") || lower.includes("halal") || lower.includes("haccp")) return AI_RESPONSES.certificate
  if (lower.includes("freight") || lower.includes("logistics") || lower.includes("shipping line")) return AI_RESPONSES.freight
  if (lower.includes("shipping") || lower.includes("transit") || lower.includes("port")) return AI_RESPONSES.shipping
  if (lower.includes("payment") || lower.includes("letter of credit") || lower.includes(" lc ") || lower.includes("tt ") || lower.includes("telegraphic")) return AI_RESPONSES.payment
  if (lower.includes("basmati") || lower.includes("rice")) return AI_RESPONSES.basmati
  if (lower.includes("sesame")) return AI_RESPONSES.sesame
  if (lower.includes("mango") || lower.includes("mangoes")) return AI_RESPONSES.mango
  if (lower.includes("maize") || lower.includes("corn")) return AI_RESPONSES.maize
  if (lower.includes("moq") || lower.includes("minimum order") || lower.includes("minimum quantity")) return AI_RESPONSES.moq
  return AI_RESPONSES.default
}

// ─── CHAT TYPES ────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number
  role: "user" | "ai"
  text: string
  timestamp: Date
}

// ─── RENDER BOLD MARKDOWN ─────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <span key={i} className="block">
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
        )}
      </span>
    )
  })
}

// ─── HS CODE DATA ─────────────────────────────────────────────────────────────
const HS_CODES = [
  { code: "1006.30", description: "Basmati Rice (Milled)", unit: "MT", duty: "0%", markets: "UAE, UK, USA, KSA", status: "Active", category: "Rice & Cereals" },
  { code: "1006.10", description: "Rice (Husked/Brown)", unit: "MT", duty: "0%", markets: "UAE, India, China", status: "Active", category: "Rice & Cereals" },
  { code: "1207.40", description: "Sesame Seeds", unit: "MT", duty: "0%", markets: "China, Japan, EU", status: "Active", category: "Oilseeds" },
  { code: "1005.90", description: "Yellow Maize", unit: "MT", duty: "0%", markets: "Malaysia, Indonesia", status: "Active", category: "Rice & Cereals" },
  { code: "0804.50", description: "Fresh Mangoes", unit: "MT", duty: "0%", markets: "UAE, UK, Germany", status: "Active", category: "Fruits" },
  { code: "0805.20", description: "Kinnow/Mandarins", unit: "MT", duty: "0%", markets: "Russia, UAE, EU", status: "Active", category: "Fruits" },
  { code: "1101.00", description: "Wheat Flour", unit: "MT", duty: "5%", markets: "Afghanistan, Africa", status: "Restricted", category: "Rice & Cereals" },
  { code: "1512.11", description: "Sunflower Oil (Crude)", unit: "MT", duty: "0%", markets: "EU, Middle East", status: "Active", category: "Oilseeds" },
  { code: "0713.40", description: "Black Gram (Urad) Lentils", unit: "MT", duty: "0%", markets: "India, UK, USA", status: "Active", category: "Vegetables" },
  { code: "0713.20", description: "Chickpeas (Desi & Kabuli)", unit: "MT", duty: "0%", markets: "India, EU, USA", status: "Active", category: "Vegetables" },
  { code: "0904.21", description: "Dried Chillies", unit: "MT", duty: "0%", markets: "Middle East, EU", status: "Active", category: "Spices" },
  { code: "0910.91", description: "Mixed Spices", unit: "MT", duty: "0%", markets: "UK, UAE, USA", status: "Active", category: "Spices" },
  { code: "5201.00", description: "Cotton Lint (Raw)", unit: "MT", duty: "0%", markets: "China, Bangladesh", status: "Active", category: "Industrial" },
  { code: "1701.14", description: "Raw Sugar (Cane)", unit: "MT", duty: "0%", markets: "Afghanistan, Africa", status: "Active", category: "Industrial" },
  { code: "2401.10", description: "Tobacco (Unmanufactured)", unit: "MT", duty: "0%", markets: "EU, China, UAE", status: "Restricted", category: "Industrial" },
  { code: "0803.90", description: "Bananas (Fresh)", unit: "MT", duty: "0%", markets: "UAE, Saudi Arabia", status: "Active", category: "Fruits" },
  { code: "0407.11", description: "Fertilized Eggs (Hatching)", unit: "1000 pcs", duty: "0%", markets: "UAE, Malaysia", status: "Active", category: "Vegetables" },
  { code: "1507.10", description: "Soybean Oil (Crude)", unit: "MT", duty: "0%", markets: "EU, Middle East", status: "Active", category: "Oilseeds" },
  { code: "1006.20", description: "Husked (Brown) Rice", unit: "MT", duty: "0%", markets: "EU, USA", status: "Active", category: "Rice & Cereals" },
  { code: "1108.12", description: "Maize Starch", unit: "MT", duty: "5%", markets: "EU, Middle East", status: "Active", category: "Industrial" },
  { code: "0901.11", description: "Coffee Beans (Green)", unit: "MT", duty: "Exempt", markets: "EU, USA", status: "Exempt", category: "Spices" },
  { code: "0902.10", description: "Green Tea (Unfermented)", unit: "MT", duty: "0%", markets: "China, Japan", status: "Active", category: "Spices" },
  { code: "1904.10", description: "Cornflakes / Puffed Cereals", unit: "MT", duty: "5%", markets: "UAE, UK", status: "Active", category: "Rice & Cereals" },
  { code: "0805.10", description: "Fresh Oranges", unit: "MT", duty: "0%", markets: "Russia, UAE, EU", status: "Active", category: "Fruits" },
  { code: "1515.50", description: "Sesame Oil", unit: "MT", duty: "0%", markets: "Japan, China, EU", status: "Active", category: "Oilseeds" },
]

const HS_CATEGORIES = ["All", "Rice & Cereals", "Oilseeds", "Fruits", "Vegetables", "Spices", "Industrial"]

// ─── INCOTERMS DATA ────────────────────────────────────────────────────────────
const INCOTERMS = [
  {
    code: "EXW",
    name: "Ex Works",
    mode: "any",
    icon: "🏭",
    short: "Seller makes goods available at their premises. Buyer takes all responsibility from there.",
    seller: ["Make goods available at named place", "Provide commercial invoice & packing list", "Notify buyer goods are ready"],
    buyer: ["Arrange all transport & insurance", "Handle export customs clearance", "Bear all costs & risks from seller's door"],
    riskTransfer: "At seller's premises / factory gate",
    costTransfer: "At seller's premises",
    whenToUse: "When buyer has strong local logistics capability and wants maximum control. Least favorable for buyer in practice.",
  },
  {
    code: "FCA",
    name: "Free Carrier",
    mode: "any",
    icon: "🚛",
    short: "Seller delivers to a named carrier or place nominated by buyer. Risk passes at that point.",
    seller: ["Deliver to named carrier/place", "Clear goods for export", "Provide export documents"],
    buyer: ["Arrange main carriage & insurance", "Bear risk from named point onward", "Handle import customs"],
    riskTransfer: "When goods handed to carrier at named place",
    costTransfer: "At named place of delivery",
    whenToUse: "Flexible term suitable for containerized cargo. Preferred over FOB for containers by ICC.",
  },
  {
    code: "CPT",
    name: "Carriage Paid To",
    mode: "any",
    icon: "✈️",
    short: "Seller pays freight to named destination but risk transfers to buyer when goods are handed to first carrier.",
    seller: ["Pay freight to named destination", "Clear for export", "Hand goods to first carrier"],
    buyer: ["Bear risk from point of first carrier", "Arrange insurance (not mandatory)", "Handle import customs & duties"],
    riskTransfer: "When handed to first carrier",
    costTransfer: "At named destination (freight paid by seller)",
    whenToUse: "Air, multimodal, or containerized shipments where seller pays freight but risk passes early.",
  },
  {
    code: "CIP",
    name: "Carriage & Insurance Paid To",
    mode: "any",
    icon: "✈️",
    short: "Like CPT but seller must also provide insurance. Seller pays freight AND insurance to named destination.",
    seller: ["Pay freight & insurance to destination", "Minimum ICC (A) insurance required", "Clear for export"],
    buyer: ["Bear risk from first carrier onward", "Handle import duties & clearance"],
    riskTransfer: "When handed to first carrier",
    costTransfer: "At named destination (freight + insurance paid by seller)",
    whenToUse: "High-value goods where comprehensive insurance is critical. Best for air/multimodal shipments.",
  },
  {
    code: "DAP",
    name: "Delivered at Place",
    mode: "any",
    icon: "📦",
    short: "Seller delivers goods ready for unloading at named destination. Buyer handles import duties.",
    seller: ["Deliver to named place, ready for unloading", "Bear all freight, insurance & risk", "Handle export clearance"],
    buyer: ["Unload goods at destination", "Pay import duties & taxes", "Handle import customs clearance"],
    riskTransfer: "At named place of destination, ready for unloading",
    costTransfer: "At destination (seller pays all except import duties)",
    whenToUse: "When seller can arrange delivery to buyer's country. Buyer only handles import clearance.",
  },
  {
    code: "DPU",
    name: "Delivered at Place Unloaded",
    mode: "any",
    icon: "🏗️",
    short: "Seller delivers AND unloads goods at named destination. New term replacing DAT in Incoterms 2020.",
    seller: ["Deliver AND unload at named place", "Bear all risks until unloading complete", "Arrange import clearance not required"],
    buyer: ["Handle import duties & customs", "Accept delivery once unloaded"],
    riskTransfer: "Once goods are unloaded at destination",
    costTransfer: "At destination including unloading costs",
    whenToUse: "When seller can perform unloading. Terminal, warehouse, or port destinations. Replaces DAT.",
  },
  {
    code: "DDP",
    name: "Delivered Duty Paid",
    mode: "any",
    icon: "🏠",
    short: "Maximum obligation on seller — delivers duty paid to buyer's premises. Buyer only needs to unload.",
    seller: ["Pay all freight, insurance, duties, taxes", "Handle both export AND import clearance", "Deliver to buyer's named premises"],
    buyer: ["Unload goods (unless DPU)", "Minimum responsibility"],
    riskTransfer: "At named place of destination",
    costTransfer: "All costs borne by seller including import duties",
    whenToUse: "Online/B2C or when seller has strong presence in buyer's country. Maximum commitment from seller.",
  },
  {
    code: "FAS",
    name: "Free Alongside Ship",
    mode: "sea",
    icon: "⚓",
    short: "Seller delivers goods alongside the vessel at the named port. Risk passes at quayside.",
    seller: ["Deliver goods alongside vessel at port", "Handle export clearance", "Bear costs to quayside"],
    buyer: ["Load goods onto vessel", "Pay freight & insurance", "Bear all risk once goods are alongside"],
    riskTransfer: "Alongside vessel at named port of shipment",
    costTransfer: "At quayside / alongside vessel",
    whenToUse: "Bulk commodities loaded directly onto vessel. Less common than FOB for containerized goods.",
  },
  {
    code: "FOB",
    name: "Free On Board",
    mode: "sea",
    icon: "🚢",
    short: "Seller loads goods onto vessel. Risk and cost pass when goods are on board at named port.",
    seller: ["Load goods onto nominated vessel", "Clear goods for export", "Provide B/L and export docs"],
    buyer: ["Pay ocean freight & insurance", "Bear risk once goods on board", "Handle import customs & duties"],
    riskTransfer: "When goods cross the ship's rail / are on board",
    costTransfer: "At named port of shipment (on board vessel)",
    whenToUse: "Most common term for bulk & containerized agricultural exports. OG Exports standard quotation basis.",
  },
  {
    code: "CFR",
    name: "Cost & Freight",
    mode: "sea",
    icon: "🚢",
    short: "Seller pays freight to destination port. Risk transfers when goods are on board at origin.",
    seller: ["Pay freight to destination port", "Handle export clearance & loading", "Risk ends when goods on board"],
    buyer: ["Arrange marine insurance", "Bear risk from loading onward", "Handle import duties & clearance"],
    riskTransfer: "When goods are on board at port of shipment",
    costTransfer: "At destination port (freight paid, insurance not)",
    whenToUse: "When seller arranges freight but buyer wants to control insurance. Sea/river transport only.",
  },
  {
    code: "CIF",
    name: "Cost, Insurance & Freight",
    mode: "sea",
    icon: "🚢",
    short: "Seller pays freight AND provides minimum insurance to destination port. Popular for commodity trade.",
    seller: ["Pay freight & minimum insurance", "Handle export clearance", "Provide insurance certificate (min ICC C)"],
    buyer: ["Bear risk from loading onward", "Consider additional insurance (min coverage only)", "Handle import duties"],
    riskTransfer: "When goods are on board at port of shipment",
    costTransfer: "At destination port (freight + min insurance paid)",
    whenToUse: "Most common term in agricultural commodity trade globally. OG Exports offers CIF quotes to major ports.",
  },
]

// ─── DOCUMENT DATA ────────────────────────────────────────────────────────────
interface ExportDoc {
  name: string
  authority: string
  processingTime: string
  countries: string[]
  required: (country: string, product: string) => boolean
  alwaysRequired: boolean
}

const EXPORT_DOCUMENTS: ExportDoc[] = [
  {
    name: "Commercial Invoice",
    authority: "Exporter / OG Exports",
    processingTime: "Same day",
    countries: ["All"],
    alwaysRequired: true,
    required: () => true,
  },
  {
    name: "Packing List",
    authority: "Exporter / OG Exports",
    processingTime: "Same day",
    countries: ["All"],
    alwaysRequired: true,
    required: () => true,
  },
  {
    name: "Bill of Lading / Airway Bill",
    authority: "Shipping Line / Airline",
    processingTime: "2–3 days after loading",
    countries: ["All"],
    alwaysRequired: true,
    required: () => true,
  },
  {
    name: "Certificate of Origin",
    authority: "TDAP / Chamber of Commerce",
    processingTime: "1–2 working days",
    countries: ["UAE", "Saudi Arabia", "UK", "Germany", "Netherlands", "China", "Malaysia", "Indonesia", "Egypt", "Kenya", "USA", "Canada", "Australia", "Japan", "Singapore"],
    alwaysRequired: false,
    required: () => true,
  },
  {
    name: "Phytosanitary Certificate",
    authority: "Dept. of Plant Protection (DPPD)",
    processingTime: "3–5 working days",
    countries: ["All"],
    alwaysRequired: false,
    required: (_c, product) => ["Rice", "Sesame Seeds", "Maize", "Fruits", "Spices"].includes(product),
  },
  {
    name: "Fumigation Certificate",
    authority: "Licensed Fumigation Company",
    processingTime: "1–2 working days",
    countries: ["All"],
    alwaysRequired: false,
    required: (_c, product) => ["Rice", "Maize", "Spices"].includes(product),
  },
  {
    name: "PSQCA Quality Certificate",
    authority: "Pakistan Standards & Quality Control Authority",
    processingTime: "5–7 working days",
    countries: ["All"],
    alwaysRequired: false,
    required: (_c, product) => product !== "Other",
  },
  {
    name: "Halal Certificate",
    authority: "PHDEC / Approved Halal Body",
    processingTime: "7–14 working days",
    countries: ["UAE", "Saudi Arabia", "Malaysia", "Indonesia", "Egypt"],
    alwaysRequired: false,
    required: (country, _p) => ["UAE", "Saudi Arabia", "Malaysia", "Indonesia", "Egypt"].includes(country),
  },
  {
    name: "EUR.1 Movement Certificate",
    authority: "Pakistan Customs / TDAP",
    processingTime: "2–3 working days",
    countries: ["Germany", "Netherlands", "UK"],
    alwaysRequired: false,
    required: (country, _p) => ["Germany", "Netherlands", "UK"].includes(country),
  },
  {
    name: "GSP Form A (Generalised Preferences)",
    authority: "TDAP",
    processingTime: "2–3 working days",
    countries: ["UK", "Germany", "Netherlands", "Canada", "Japan"],
    alwaysRequired: false,
    required: (country, _p) => ["UK", "Germany", "Netherlands", "Canada", "Japan"].includes(country),
  },
  {
    name: "HACCP / Food Safety Certificate",
    authority: "Third-party Auditor (SGS / Bureau Veritas)",
    processingTime: "2–4 weeks (initial audit)",
    countries: ["Germany", "Netherlands", "UK", "USA", "Canada", "Australia"],
    alwaysRequired: false,
    required: (country, _p) => ["Germany", "Netherlands", "UK", "USA", "Canada", "Australia"].includes(country),
  },
  {
    name: "Lab Analysis / Test Report",
    authority: "Accredited Laboratory (PCSIR / SGS)",
    processingTime: "3–5 working days",
    countries: ["All"],
    alwaysRequired: false,
    required: () => true,
  },
  {
    name: "Weight & Measurement Certificate",
    authority: "Pakistan Weight & Measures",
    processingTime: "1–2 working days",
    countries: ["All"],
    alwaysRequired: false,
    required: () => true,
  },
]

const COUNTRIES = [
  "UAE", "Saudi Arabia", "UK", "Germany", "Netherlands",
  "China", "Malaysia", "Indonesia", "Egypt", "Kenya",
  "USA", "Canada", "Australia", "Japan", "Singapore"
]

const PRODUCT_CATEGORIES = ["Rice", "Sesame Seeds", "Maize", "Fruits", "Spices", "Other"]

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AiHub() {
  usePageTitle("AI Trade Hub", "AI-powered trade tools — HS codes, incoterms, export documentation assistant")

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "ai",
      text: "👋 Hello! I'm the **OG Exports AI Trade Assistant**. I can help you with pricing, documentation, incoterms, HS codes, shipping, and product specifications.\n\nWhat can I help you with today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // HS Code state
  const [hsSearch, setHsSearch] = useState("")
  const [hsCategory, setHsCategory] = useState("All")

  // Incoterms state
  const [expandedIncoterm, setExpandedIncoterm] = useState<string | null>(null)

  // Documentation state
  const [docCountry, setDocCountry] = useState("")
  const [docProduct, setDocProduct] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const sendMessage = (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg) return

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text: msg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const response = getAiResponse(msg)
      const aiMsg: ChatMessage = { id: Date.now() + 1, role: "ai", text: response, timestamp: new Date() }
      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 900)
  }

  const SUGGESTED = [
    "What documents do I need for UAE?",
    "Current Basmati rice price?",
    "Explain FOB incoterm",
    "HS code for sesame seeds",
    "Payment terms for first order",
    "Minimum order quantity",
  ]

  const filteredHsCodes = HS_CODES.filter(item => {
    const matchesSearch =
      !hsSearch ||
      item.code.includes(hsSearch) ||
      item.description.toLowerCase().includes(hsSearch.toLowerCase()) ||
      item.markets.toLowerCase().includes(hsSearch.toLowerCase())
    const matchesCategory = hsCategory === "All" || item.category === hsCategory
    return matchesSearch && matchesCategory
  })

  const requiredDocs =
    docCountry && docProduct
      ? EXPORT_DOCUMENTS.filter(doc => doc.required(docCountry, docProduct))
      : []

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-card border-b border-border pt-32 pb-12">
        <div className="container px-4 md:px-6 text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase gap-1.5">
            <Sparkles className="w-3 h-3" /> AI Trade Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold">
            AI-Powered Trade Intelligence
          </h1>
          <p className="text-lg text-muted-foreground">
            HS Code finder, Incoterms guide, export documentation assistant, and AI trade advisor — all in one place.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="container px-4 md:px-6 py-10 max-w-6xl mx-auto">
        <Tabs defaultValue="chat">
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 mb-8 h-auto gap-1 bg-muted p-1 rounded-xl">
            <TabsTrigger value="chat" className="gap-1.5 py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <MessageSquare className="w-4 h-4" /> AI Assistant
            </TabsTrigger>
            <TabsTrigger value="hscode" className="gap-1.5 py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Hash className="w-4 h-4" /> HS Codes
            </TabsTrigger>
            <TabsTrigger value="incoterms" className="gap-1.5 py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Ship className="w-4 h-4" /> Incoterms
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5 py-2.5 text-xs md:text-sm font-medium rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <FileText className="w-4 h-4" /> Doc Assistant
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════
              TAB 1: AI TRADE ASSISTANT
          ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="chat">
            <div className="luxury-card rounded-2xl overflow-hidden flex flex-col" style={{ height: "680px" }}>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card">
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm">OG Exports Trade Assistant</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Online · Agricultural trade specialist
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        msg.role === "ai"
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-accent/20 border border-accent/30"
                      }`}>
                        {msg.role === "ai"
                          ? <Bot className="w-4 h-4 text-primary" />
                          : <User className="w-4 h-4 text-accent-foreground" />
                        }
                      </div>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-0.5 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm border border-border"
                      }`}>
                        {renderMarkdown(msg.text)}
                        <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Suggested questions */}
              <div className="px-4 pt-2 pb-1 border-t border-border/50 bg-card/50">
                <p className="text-[10px] text-muted-foreground font-medium mb-1.5 px-1">Suggested questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-colors text-muted-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border bg-card">
                <div className="flex gap-2 items-center max-w-2xl mx-auto">
                  <Input
                    placeholder="Ask about prices, documents, HS codes, shipping..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="flex-1 text-sm"
                  />
                  <Button size="sm" onClick={() => sendMessage()} disabled={!input.trim() || isTyping} className="gap-1.5 px-4">
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  AI responses are informational only based on OG Exports trade data. Always verify with official sources.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
              TAB 2: HS CODE FINDER
          ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="hscode">
            <div className="space-y-5">
              <div className="luxury-card p-5 rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by product name or HS code..."
                      value={hsSearch}
                      onChange={e => setHsSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={hsCategory} onValueChange={setHsCategory}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      {HS_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="luxury-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">HS Code</th>
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">Description</th>
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Unit</th>
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Export Duty</th>
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Main Markets</th>
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHsCodes.map((item, i) => (
                        <tr key={item.code} className={`data-table-row ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="px-4 py-3 font-mono font-semibold text-primary">{item.code}</td>
                          <td className="px-4 py-3 font-medium">{item.description}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{item.unit}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className={`text-xs font-semibold ${item.duty === "0%" ? "text-emerald-600 dark:text-emerald-400" : item.duty === "Exempt" ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {item.duty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{item.markets}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                              item.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                                : item.status === "Restricted"
                                ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                                : "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredHsCodes.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p>No HS codes found matching your search.</p>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                  Showing {filteredHsCodes.length} of {HS_CODES.length} codes · Source: Pakistan Customs Tariff · Always verify with FBR before shipment
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
              TAB 3: INCOTERMS 2020
          ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="incoterms">
            <div className="space-y-8">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 items-center">
                <span className="badge-green gap-1.5"><Globe className="w-3 h-3" /> Any Transport Mode</span>
                <span className="badge-gold gap-1.5"><Ship className="w-3 h-3" /> Sea / Inland Waterway Only</span>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {INCOTERMS.map(term => {
                  const isExpanded = expandedIncoterm === term.code
                  const isSea = term.mode === "sea"
                  return (
                    <div
                      key={term.code}
                      className={`luxury-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${isExpanded ? "col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4" : ""}`}
                      onClick={() => setExpandedIncoterm(isExpanded ? null : term.code)}
                    >
                      <div className={`px-4 py-3 border-b ${isSea ? "border-accent/20 bg-accent/5" : "border-primary/10 bg-primary/5"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{term.icon}</span>
                            <div>
                              <p className={`font-heading font-bold text-lg leading-none ${isSea ? "text-accent" : "text-primary"}`}>{term.code}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{term.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              isSea
                                ? "bg-accent/10 text-accent border-accent/20"
                                : "bg-primary/10 text-primary dark:text-emerald-400 border-primary/20"
                            }`}>
                              {isSea ? "Sea" : "Any"}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">{term.short}</p>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-heading font-semibold text-xs uppercase tracking-wide text-primary mb-2">Seller Responsibilities</p>
                              <ul className="space-y-1">
                                {term.seller.map((s, i) => (
                                  <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-heading font-semibold text-xs uppercase tracking-wide text-primary mb-2">Buyer Responsibilities</p>
                              <ul className="space-y-1">
                                {term.buyer.map((b, i) => (
                                  <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                                    <Circle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-heading font-semibold text-xs uppercase tracking-wide text-accent mb-2">Risk Transfer Point</p>
                              <p className="text-xs text-muted-foreground bg-accent/5 border border-accent/15 rounded-lg p-2.5">{term.riskTransfer}</p>
                              <p className="font-heading font-semibold text-xs uppercase tracking-wide text-accent mt-3 mb-2">Cost Transfer Point</p>
                              <p className="text-xs text-muted-foreground bg-accent/5 border border-accent/15 rounded-lg p-2.5">{term.costTransfer}</p>
                            </div>
                            <div>
                              <p className="font-heading font-semibold text-xs uppercase tracking-wide text-primary mb-2">When to Use</p>
                              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5 leading-relaxed">{term.whenToUse}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Comparison table */}
              <div className="luxury-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-heading font-semibold">FOB vs CIF vs DAP — Quick Comparison</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">The three most common terms in agricultural commodity trade</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase">Factor</th>
                        <th className="text-center px-4 py-3 font-heading font-semibold text-xs text-primary uppercase">FOB</th>
                        <th className="text-center px-4 py-3 font-heading font-semibold text-xs text-accent uppercase">CIF</th>
                        <th className="text-center px-4 py-3 font-heading font-semibold text-xs text-muted-foreground uppercase">DAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {[
                        ["Who pays freight?", "Buyer", "Seller", "Seller"],
                        ["Who arranges insurance?", "Buyer", "Seller (min)", "Buyer"],
                        ["Risk transfers at", "On board vessel", "On board vessel", "Named destination"],
                        ["Export clearance", "Seller", "Seller", "Seller"],
                        ["Import clearance", "Buyer", "Buyer", "Buyer"],
                        ["Best for seller?", "Simple", "More control", "Maximum effort"],
                        ["Best for buyer?", "Maximum control", "Convenient", "Simplest"],
                        ["OG Exports offers?", "✅ Yes", "✅ Yes", "On request"],
                      ].map(([factor, fob, cif, dap]) => (
                        <tr key={factor} className="data-table-row">
                          <td className="px-4 py-3 font-medium text-xs">{factor}</td>
                          <td className="px-4 py-3 text-center text-xs text-primary">{fob}</td>
                          <td className="px-4 py-3 text-center text-xs text-accent">{cif}</td>
                          <td className="px-4 py-3 text-center text-xs text-muted-foreground">{dap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════
              TAB 4: EXPORT DOCUMENTATION ASSISTANT
          ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="docs">
            <div className="space-y-6">
              {/* Step 1 & 2 */}
              <div className="luxury-card p-6 rounded-2xl">
                <h3 className="font-heading font-semibold mb-1">Export Documentation Checklist Generator</h3>
                <p className="text-sm text-muted-foreground mb-5">Select your destination country and product category to generate a tailored document checklist.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Step 1 — Destination Country
                    </label>
                    <Select value={docCountry} onValueChange={setDocCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Step 2 — Product Category
                    </label>
                    <Select value={docProduct} onValueChange={setDocProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              {docCountry && docProduct ? (
                <>
                  {/* Progress bar */}
                  <div className="luxury-card p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-heading font-semibold text-sm">
                        {requiredDocs.length} Documents Required for {docProduct} → {docCountry}
                      </p>
                      <span className="badge-gold">{requiredDocs.filter(d => d.alwaysRequired).length} Standard</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-700"
                        style={{ width: `${(requiredDocs.filter(d => d.alwaysRequired).length / requiredDocs.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {requiredDocs.filter(d => d.alwaysRequired).length} always-required · {requiredDocs.filter(d => !d.alwaysRequired).length} destination/product-specific
                    </p>
                  </div>

                  {/* Print-friendly checklist */}
                  <div ref={printRef} className="luxury-card rounded-2xl overflow-hidden print:shadow-none print:border-none">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-semibold">Document Checklist</h3>
                        <p className="text-xs text-muted-foreground">{docProduct} export to {docCountry} · Prepared by OG Exports AI</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 print:hidden">
                        <Printer className="w-4 h-4" /> Generate PDF
                      </Button>
                    </div>

                    <div className="divide-y divide-border/50">
                      {requiredDocs.map((doc, i) => (
                        <div key={doc.name} className="px-5 py-4 flex gap-4 items-start hover:bg-muted/20 transition-colors">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
                            doc.alwaysRequired
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-accent/10 text-accent border border-accent/20"
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <p className="font-medium text-sm">{doc.name}</p>
                              {doc.alwaysRequired && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wide flex-shrink-0">
                                  Always Required
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span className="font-medium">Issued by:</span> {doc.authority}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Processing:</span> {doc.processingTime}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {doc.countries[0] === "All"
                                ? <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">All Countries</span>
                                : doc.countries.map(c => (
                                  <span key={c} className={`text-[10px] px-2 py-0.5 rounded ${c === docCountry ? "bg-primary/10 text-primary border border-primary/20 font-semibold" : "bg-muted text-muted-foreground"}`}>
                                    {c}
                                  </span>
                                ))
                              }
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-muted-foreground/30 flex-shrink-0 mt-0.5 print:block" />
                        </div>
                      ))}
                    </div>

                    <div className="px-5 py-4 bg-muted/20 border-t border-border text-xs text-muted-foreground">
                      <strong>Disclaimer:</strong> This checklist is generated based on standard requirements for {docCountry}. Requirements may change — always confirm with your freight forwarder and the destination country's customs authority before shipment. OG Exports assists with all documentation coordination.
                    </div>
                  </div>
                </>
              ) : (
                <div className="luxury-card rounded-2xl py-20 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Select a destination country and product category above</p>
                  <p className="text-sm mt-1">Your tailored document checklist will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
