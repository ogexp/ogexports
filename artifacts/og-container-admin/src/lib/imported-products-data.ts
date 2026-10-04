// Wholesale marketplace — imported products data (localStorage-backed with seed data)

export interface ImportedProduct {
  id: string
  name: string
  category: string
  status: "available" | "limited" | "out-of-stock" | "coming-soon"
  badge?: string
  countryOfOrigin: string
  imageUrl?: string
  videoUrl?: string
  specifications?: string
  specs: string[]
  availableStock: string
  moq: string
  deliveryTime: string
  packaging: string
  priceVisible: boolean
  wholesalePrice: string
  warehouseLocation: string
}

const KEY = "og-imported-products"

const SEED: ImportedProduct[] = [
  {
    id: "IMP-001", name: "Malaysian Palm Oil (RBD Olein)", category: "Edible Oils",
    status: "available", badge: "Hot Seller", countryOfOrigin: "Malaysia",
    specifications: "CP8 grade, FFA max 0.1%, IV 56–59. Ideal for cooking and food manufacturing.",
    specs: ["CP8 Grade", "FFA ≤ 0.1%", "Halal Certified"],
    availableStock: "120 MT", moq: "20 MT", deliveryTime: "3–5 days",
    packaging: "Flexi / Drums", priceVisible: true, wholesalePrice: "$985/MT",
    warehouseLocation: "Karachi Port",
  },
  {
    id: "IMP-002", name: "Sri Lankan Ceylon Black Tea", category: "Beverages",
    status: "available", countryOfOrigin: "Sri Lanka",
    specifications: "BOPF grade, garden fresh, moisture max 7%. Premium high-grown Ceylon leaf.",
    specs: ["BOPF Grade", "High Grown", "ISO 3720"],
    availableStock: "18 MT", moq: "2 MT", deliveryTime: "2–4 days",
    packaging: "40kg Paper Sacks", priceVisible: true, wholesalePrice: "$3,150/MT",
    warehouseLocation: "Lahore Warehouse",
  },
  {
    id: "IMP-003", name: "Indonesian Robusta Coffee Beans", category: "Beverages",
    status: "limited", badge: "Limited Lot", countryOfOrigin: "Indonesia",
    specifications: "Grade 1, screen 16+, moisture 12.5% max. Strong body, ideal for espresso blends.",
    specs: ["Grade 1", "Screen 16+", "Sun Dried"],
    availableStock: "6 MT", moq: "1 MT", deliveryTime: "3–6 days",
    packaging: "60kg Jute Bags", priceVisible: false, wholesalePrice: "",
    warehouseLocation: "Karachi Port",
  },
  {
    id: "IMP-004", name: "Chinese Ginger (Fresh)", category: "Vegetables",
    status: "available", countryOfOrigin: "China",
    specifications: "Air-dried fresh ginger, 150g+ rhizomes, clean skin, low fiber.",
    specs: ["150g+ Size", "Washed", "Cold Chain"],
    availableStock: "40 MT", moq: "5 MT", deliveryTime: "1–3 days",
    packaging: "10kg Cartons", priceVisible: true, wholesalePrice: "$1,240/MT",
    warehouseLocation: "Karachi Cold Store",
  },
  {
    id: "IMP-005", name: "Kenyan AA Coffee Beans", category: "Beverages",
    status: "coming-soon", badge: "Pre-Order", countryOfOrigin: "Kenya",
    specifications: "AA grade arabica, bright acidity, blackcurrant notes. Arriving next consignment.",
    specs: ["AA Grade", "Arabica", "SL28 Variety"],
    availableStock: "Incoming 12 MT", moq: "1 MT", deliveryTime: "ETA 3 weeks",
    packaging: "60kg Jute Bags", priceVisible: false, wholesalePrice: "",
    warehouseLocation: "In Transit",
  },
  {
    id: "IMP-006", name: "Thai Jasmine Rice (Hom Mali)", category: "Grains",
    status: "out-of-stock", countryOfOrigin: "Thailand",
    specifications: "Premium Hom Mali 92% purity, new crop. Restock expected soon.",
    specs: ["92% Purity", "New Crop", "Fragrant"],
    availableStock: "0 MT", moq: "10 MT", deliveryTime: "—",
    packaging: "25kg PP Bags", priceVisible: false, wholesalePrice: "",
    warehouseLocation: "Karachi Port",
  },
]

export function getImportedProducts(): ImportedProduct[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return SEED
    const parsed = JSON.parse(raw) as ImportedProduct[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED
  } catch {
    return SEED
  }
}

export function saveImportedProducts(products: ImportedProduct[]) {
  localStorage.setItem(KEY, JSON.stringify(products))
}
