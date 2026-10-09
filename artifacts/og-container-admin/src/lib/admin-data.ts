// ─── Central Admin Data Store — Laravel API backed (in-memory cache) ─────────
import { api, unwrapList, unwrapPage, mapProduct, ensureCsrf, toStoredMediaPath, resolveMediaUrl } from "@/lib/api"
import {
  fetchAdminExchangeRates,
  formatLeadValue,
  formatProjectInvestmentAmount,
  formatUserAmount,
  userCurrencyContextFromApi,
} from "@/lib/admin-currency"
import { refreshBankAccounts } from "@/lib/bank-accounts"
import { refreshIncoterms } from "@/lib/incoterms-admin"
import { normalizeOrderStatus, orderStatusLabel } from "@/lib/order-statuses"
import {
  normalizeContainerProjectStatus,
  type ContainerProjectStatus,
} from "@/lib/container-project-statuses"
import { parsePlatformBool } from "@/lib/parse-platform-bool"
import { isPakistanCountry } from "@/lib/display-currency"

export const AKEYS = {
  seeded: "og-admin-seeded-v2",
  productsSeedV2: "og-admin-products-seeded-v2",
  investSeedV2: "og-admin-invest-seeded-v2",
  users: "og-admin-users",
  orders: "og-admin-orders",
  deposits: "og-admin-deposits",
  withdrawals: "og-admin-withdrawals",
  transactions: "og-admin-transactions",
  products: "og-admin-products",
  shipments: "og-admin-shipments",
  kyc: "og-admin-kyc",
  aml: "og-admin-aml",
  tickets: "og-admin-tickets",
  crmLeads: "og-admin-crm-leads",
  crmActivities: "og-admin-crm-activities",
  investProjects: "og-admin-invest-projects",
  auditLogs: "og-admin-audit-logs",
  settings: "og-admin-settings",
}

export const SUPPLIER_OFFERS_KEY = "og-admin-supplier-offers"
export const SUPPLIER_RATINGS_KEY = "og-admin-supplier-ratings"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string; fullName: string; email: string; phone: string
  accountType: "buyer" | "supplier" | "investor" | "admin"
  kycStatus: "pending" | "verified" | "rejected" | "suspended" | "review"
  trustScore: number; status: "active" | "suspended" | "inactive"
  createdAt: string; country?: string; company?: string
  orders?: number; orderValue?: string; portfolio?: string; roi?: string
  category?: string; rating?: number; capacity?: string; dept?: string
  role?: string; lastSeen?: string; avatarUrl?: string
  kycApplicationId?: string; kycDocumentCount?: number
}

export interface AdminKycDocument {
  id: number
  docType: string
  label: string
  path: string
  originalName?: string
  url?: string
  viewUrl?: string
  downloadUrl?: string
}

export interface AdminOrder {
  id: string; buyer: string; product: string; qty: string; value: string
  status: import("@/lib/order-statuses").OrderStatusCode
  payment: string; date: string; pm: string
  paymentMethod?: string
  paymentStatus?: string
  paymentNotes?: string
  currency?: string
  destination?: string
  destinationPort?: string
  incoterm?: string
  requiredDeliveryDate?: string
  statusTimeline?: import("@/lib/order-statuses").StatusTimelineMap
}

export interface AdminRFQ {
  id: string; buyer: string; product: string; qty: string; destination: string
  status: "new" | "quoted" | "converted" | "expired"; submitted: string
  incoterm?: string
  paymentTerms?: string
  requiredDeliveryDate?: string
  attachments?: Array<{
    id?: number
    path: string
    original_name?: string | null
    mime?: string | null
    url?: string | null
    is_image?: boolean
  }>
}

export interface AdminQuotation {
  id: string; rfq: string; buyer: string; product: string; totalValue: string
  validUntil: string; status: "sent" | "accepted" | "expired" | "draft"; terms: string
}

export interface AdminDeposit {
  id: string; investor: string; email: string; amount: string; method: string
  ref: string; bankRef?: string; date: string; status: "pending" | "approved" | "rejected" | "cancelled"
  note?: string
  proofPath?: string
  proofUrl?: string
  adminBankName?: string
  adminAccountNumber?: string
}

export interface AdminBuyerDeposit {
  id: string
  orderNumber: string
  buyer: string
  email: string
  amount: string
  method: string
  field1Label: string
  field1Value: string
  field2Label: string
  field2Value: string
  ref: string
  details: string
  date: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  product: string
}

export interface AdminWithdrawal {
  id: string; investor: string; amount: string; bank: string; ref: string
  requested: string; status: "pending" | "review" | "approved" | "rejected"; note: string
  bankDetails?: Record<string, string>
}

export interface AdminTransaction {
  id: string; type: string; user: string; amount: string; date: string
  method: string; status: "completed" | "pending" | "rejected"
}

export interface PlatformWalletStats {
  balance: number
  currency: string
  activeInvestmentsTotal: number
  pendingReturnsTotal: number
}

export interface FinanceCashflowPoint {
  month: string
  deposits: number
  withdrawals: number
  profit: number
}

export interface FinanceOverviewStats {
  monthlyRevenue: number
  monthlyRevenueMomPct: number
  monthlyWithdrawals: number
  monthLabel: string
  platformBalance: number
  totalInvestors: number
  avgPortfolio: number
  cumulativeReturns: number
  cashflow: FinanceCashflowPoint[]
}

export interface AdminFinancePageMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface AdminFinancePages {
  deposits: AdminFinancePageMeta
  withdrawals: AdminFinancePageMeta
  transactions: AdminFinancePageMeta
}

export interface AdminFinancePageRequest {
  depositsPage?: number
  withdrawalsPage?: number
  transactionsPage?: number
  strict?: boolean
}

export interface AdminReportsInvestmentType {
  type: string
  typeKey: string
  raised: number
  investors: number
  avgRoiPct: number
}

export interface AdminReportsData {
  kpis: {
    totalRevenue: number
    ytdRevenue: number
    revenueYoyPct: number
    ordersTotal: number
    ordersYoyPct: number
    activeBuyers: number
    buyersTotal: number
    buyersYoyPct: number
    shipmentsTotal: number
    shipmentsYoyPct: number
  }
  businessStats: {
    totalRevenueYtd: number
    totalProfitYtd: number
    profitMarginPct: number
    totalOrders: number
    activeBuyers: number
    countriesReached: number
    productsCatalogued: number
    productsApproved: number
    onTimeDeliveryPct: number
    avgLeadTimeDays: number
    customerSatisfaction: number
    complianceRatePct: number
    revenueYoyPct: number
    ordersYoyPct: number
    buyersYoyPct: number
  }
  logistics: {
    totalShipments: number
    inTransit: number
    delivered: number
    onTimeRatePct: number
  }
  investmentsByType: AdminReportsInvestmentType[]
  revenueTrend: { month: string; revenue: number; profit: number; expenses: number }[]
  quarterlyRevenue: { quarter: string; revenue: number }[]
}

/** Format admin money for KPI cards. Null/undefined/NaN → $0.00 */
export function formatAdminMoney(value: number | null | undefined, compact = true): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "$0.00"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (compact && abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`
  }
  if (compact && abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`
  }
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatAdminPct(value: number | null | undefined, suffix = "%"): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return `0${suffix}`
  const sign = n > 0 ? "+" : ""
  return `${sign}${n}${suffix}`
}

export interface AdminProduct {
  id: string; name: string; category: string; categoryId?: number | null; sku: string; price: string
  minOrder: string; origin: string; status: "approved" | "pending" | "rejected" | "draft"
  stock: string; rating: number; orders: number
  fob?: string; description?: string; shortDescription?: string; incoterms?: string; videoUrl?: string
  /** Resolved display URL for primary image */
  imageUrl?: string
  /** Raw relative/legacy path stored in DB */
  imagePath?: string
  /** Lab report PDF path (storage) */
  labReportPath?: string
  /** Resolved lab report URL */
  labReportUrl?: string
  /** Whether a lab/product report file is attached */
  hasLabReport?: boolean
  /** Resolved display URLs for gallery */
  galleryUrls?: string[]
  /** Raw relative/legacy paths for gallery (product_media) */
  galleryPaths?: string[]
  slug?: string; featured?: boolean
  hsCode?: string; leadTime?: string; moq?: string; shelfLife?: string; storageInstructions?: string
  specs?: { label: string; value: string }[]
  certifications?: string[]; paymentTerms?: string[]; deliveryTerms?: string[]
  packagingOptions?: string[]; exportMarkets?: string[]
}

export interface AdminCategory {
  id: number
  name: string
  slug: string
}

export interface AdminShipmentDocument {
  id: number
  type: string
  title: string
  path: string
  url?: string
}

export interface AdminShipment {
  id: string; order: string; buyer: string; product: string; vessel: string
  container: string; origin: string; destination: string; line: string
  etd: string; eta: string
  /** ISO YYYY-MM-DD for date inputs */
  etdIso?: string
  etaIso?: string
  status: "pending" | "booking" | "in-transit" | "arrived" | "delivered"
  milestone: string
  orderId?: number | null
  paymentMethod?: string
  paymentStatus?: string
  paymentNotes?: string
  documents: AdminShipmentDocument[]
}

export interface AdminKYC {
  id: string; userId: string; name: string; type: "company" | "individual"; country: string
  submitted: string; docs: string[]; documents: AdminKycDocument[]
  status: "pending" | "approved" | "rejected" | "review"; risk: "low" | "medium" | "high"
  notes?: string
}

export interface AdminAMLAlert {
  id: string; severity: "high" | "medium" | "low"; user: string; type: string
  amount: string; flagged: string; details: string
  status: "open" | "investigating" | "resolved"
}

export interface AdminTicketMsg {
  from: string; text: string; time: string; isAdmin: boolean
}

export interface AdminTicket {
  id: string
  ticketNumber: string
  subject: string
  user: string
  type: "buyer" | "investor" | "supplier"
  priority: "high" | "medium" | "low"
  status: "open" | "escalated" | "pending" | "resolved" | "closed"
  assignee: string
  created: string
  lastReply: string
  msgs: number
  messages: AdminTicketMsg[]
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

export interface AdminCRMLead {
  id: string; name: string; country: string; value: string; product: string
  contact: string; date: string; stage: string
}

export interface AdminCRMActivity {
  id: string; lead: string; type: string; note: string; time: string; user: string
}

export interface AdminInvestProjectDocument {
  id: number
  title: string
  name?: string
  size?: string
  sizeBytes?: number
  originalName?: string
  path?: string
  url?: string
  downloadUrl?: string
}

export type AdminFacilityProjectStatus =
  | "draft"
  | "coming_soon"
  | "funding"
  | "fully_funded"
  | "under_construction"
  | "active"
  | "operational"
  | "completed"
  | "closed"

export interface AdminInvestProject {
  id: string; title: string; reference?: string; type: "container" | "produce" | "plant" | "ricemill" | "feed" | "cold_storage" | "domestic_trading"
  /** Export vs Import for container projects */
  tradeDirection?: "export" | "import"
  target: number; raised: number; investors: number
  targetAmountAvailable?: boolean; raisedAmountAvailable?: boolean; investorCountAvailable?: boolean
  currency?: string
  status: ContainerProjectStatus | AdminFacilityProjectStatus
  roi: string; location?: string; vessel?: string; etd?: string; eta?: string; completion?: string
  /** Resolved display URL for cover image */
  imageUrl?: string
  /** Raw relative/legacy path stored in DB */
  imagePath?: string
  description?: string; commodity?: string; variety?: string
  containerType?: string; containerNumber?: string; containerValue?: number; minInvestment?: number; maxInvestment?: number | null
  destination?: string; destinationFlag?: string; destinationCountry?: string
  portOfLoading?: string; portOfDischarge?: string; origin?: string
  incoterm?: string; paymentTermsInvest?: string; riskLevel?: "low" | "medium" | "high"
  fundingDeadlineDate?: string; investmentPeriodDays?: number; expectedReturnPct?: number
  targetDistributionDate?: string
  currentProjectStage?: string; productCategory?: string; shippingLine?: string
  /** Display timeline for facility opportunity cards (stored in meta.timeline) */
  timeline?: string
  /** Listing sort order for facility opportunities (stored in meta.sort_order) */
  sortOrder?: number
  createdAt?: string
  documents?: AdminInvestProjectDocument[]
  pendingReserved?: number
  pendingCount?: number
  fundingPercentage?: number
  remainingAmount?: number
  isFull?: boolean
  slotsRemaining?: number
  meta?: Record<string, unknown>
}

export interface AdminProjectInvestment {
  id: string
  projectId: string
  investorId: string
  investorName: string
  investorEmail: string
  amount: number
  amountFormatted?: string
  profitAmount: number | null
  profitAmountFormatted?: string | null
  status: string
  reference: string
  investedAt: string
  approvedAt?: string
  investor?: { id?: string; name?: string; email?: string; country?: string; display_pkr?: boolean; currency?: string; wallet_currency?: string }
}

export interface AdminProjectDeposit {
  id: string
  reference: string
  amount: number
  amountPkr?: number | null
  amountFormatted?: string
  amountCurrency?: string
  profitAmount: number | null
  profitAmountPkr?: number | null
  profitAmountFormatted?: string | null
  totalReturn?: number | null
  settlementDate?: string
  status: "pending" | "active" | "completed" | "cancelled"
  investedAt: string
  approvedAt?: string
  createdAt?: string
  paymentSource?: string
  paymentSourceLabel?: string
  walletFundingDeposits?: Array<{
    id: string
    reference: string
    method: string
    methodLabel: string
    amount: number
    currency: string
    reviewedAt?: string
    projectId?: string
  }>
  project: {
    id: string
    title: string
    reference?: string
    type?: string
    status?: string
    imageUrl?: string
    commodity?: string
    variety?: string
    description?: string
    container_type?: string
    vessel?: string
    shipping_line?: string
    port_of_loading?: string
    port_of_discharge?: string
    origin?: string
    destination?: string
    incoterm?: string
    etd?: string
    eta?: string
    expected_return_pct?: number
    investment_period_days?: number
    target_amount?: number
    raised_amount?: number
    pending_reserved?: number
    remaining_amount?: number
    funding_percentage?: number
    investors_count?: number
    current_project_stage?: string
    location?: string
    completion?: string
    meta?: Record<string, unknown>
  }
  investor: { id: string; name: string; email: string; avatarUrl?: string; country?: string; display_pkr?: boolean; currency?: string; wallet_currency?: string }
}

export interface AdminProjectDetail {
  project: AdminInvestProject
  stats: {
    targetAmount: number
    raisedAmount: number
    pendingReserved: number
    remainingAmount: number
    investorsCount: number
    pendingCount: number
    isFull: boolean
    slotsRemaining: number
  }
  investments: AdminProjectInvestment[]
}

export interface AdminProjectStageUpdate {
  id: number
  stage: string
  status: string
  description: string
  occurred_at: string
  created_at: string
}

export interface AdminProjectStageUpdateInput {
  stage: string
  status: string
  description: string
  occurred_at: string
}

export interface AdminAuditLog {
  id: string; actor: string; action: string; module: string; ip: string; timestamp: string
}

export interface AdminSettings {
  siteName: string; tagline: string; supportEmail: string; whatsapp: string
  maintenanceMode: boolean; registrationOpen: boolean; kycRequired: boolean
  investmentOpen: boolean; investmentModuleEnabled: boolean; supplierModuleEnabled: boolean
  adminOtpEnabled: boolean
  investPlantVisible: boolean; investFeedsVisible: boolean; investRicemillVisible: boolean
  investYellowMaizeVisible: boolean; investProduceVisible: boolean
  /**
   * Master switch: when true, Pakistani investors may see PKR (alone or dual).
   * When false, all investors see USD only.
   */
  investPkrDisplayEnabled: boolean
  /** Sub-option when PKR display is on: true = PKR + ($USD), false = PKR only. */
  investDualCurrencyEnabled: boolean
  /** When true, Pakistani suppliers see amounts in PKR only. When false, USD only. */
  supplierPkrDisplayEnabled: boolean
  /** When true, Pakistani buyers see amounts in PKR only. When false, USD only. */
  buyerPkrDisplayEnabled: boolean
  currency: string; minInvestment: number
  paymentMethods: { id: string; name: string; enabled: boolean; priority: number; desc: string }[]
  notifications: { emailOnOrder: boolean; emailOnDeposit: boolean; smsOnKYC: boolean; whatsappAlerts: boolean }
}

export interface SupplierOfferNote {
  text: string
  at: string
}

export interface SupplierOffer {
  id: string
  supplierId: string
  supplierName: string
  supplierCountry: string
  supplierVerified: boolean
  category: string
  productName: string
  origin: string
  specifications?: string
  availableQty: string
  priceFob: string
  currency?: string
  incoterm?: string
  priceUnit?: string
  moq: string
  leadTime: string
  packaging: string
  paymentTerms: string
  certifications: string[]
  validUntil: string
  hsCode?: string
  remarks?: string
  status: "pending" | "approved" | "rejected" | "hold"
  rating?: number
  notes: SupplierOfferNote[]
  submittedAt: string
  images?: string[]
  video?: string
}

export interface FobPrice {
  product: string
  price: number
  updatedAt: string
}

export interface BuyerQuote {
  id: string
  rfqId: string
  buyer: string
  product: string
  qtyMT: number
  incoterm: string
  destination: string
  paymentTerms: string
  requiredDeliveryDate?: string
  date: string
  validUntil: string
  status: "pending_admin" | "sent" | "accepted" | "rejected"
  source: "auto-fob" | "admin"
  fobUnitPrice: number
  freight: number
  insurance: number
  docFee: number
  notes: string
}

// ─── Caches ───────────────────────────────────────────────────────────────────

let usersCache: AdminUser[] = []
let ordersCache: AdminOrder[] = []
let rfqsCache: AdminRFQ[] = []
let quotationsCache: AdminQuotation[] = []
let depositsCache: AdminDeposit[] = []
let buyerDepositsCache: AdminBuyerDeposit[] = []
let withdrawalsCache: AdminWithdrawal[] = []
let transactionsCache: AdminTransaction[] = []
let platformWalletCache: PlatformWalletStats = {
  balance: 0,
  currency: 'USD',
  activeInvestmentsTotal: 0,
  pendingReturnsTotal: 0,
}
let financeStatsCache: FinanceOverviewStats = emptyFinanceStats()
let adminReportsCache: AdminReportsData = emptyAdminReports()
let productsCache: AdminProduct[] = []
let categoriesCache: AdminCategory[] = []
type ProductsListener = () => void
const productsListeners = new Set<ProductsListener>()

function notifyProductsChanged() {
  productsListeners.forEach((listener) => listener())
}

export function subscribeProducts(listener: ProductsListener): () => void {
  productsListeners.add(listener)
  return () => { productsListeners.delete(listener) }
}
let shipmentsCache: AdminShipment[] = []
let kycCache: AdminKYC[] = []
let amlCache: AdminAMLAlert[] = []
let ticketsCache: AdminTicket[] = []
let crmLeadsCache: AdminCRMLead[] = []
let crmActivitiesCache: AdminCRMActivity[] = []
let investProjectsCache: AdminInvestProject[] = []
let auditLogsCache: AdminAuditLog[] = []
let settingsCache: AdminSettings = defaultSettings()
let supplierOffersCache: SupplierOffer[] = []
let fobPricesCache: FobPrice[] = []
let buyerQuotesCache: BuyerQuote[] = []
const fobIdByProduct = new Map<string, string>()
/** Display order id (order_number) → DB id for PATCH */
const orderDbIdByKey = new Map<string, string>()

let initPromise: Promise<void> | null = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyFinanceStats(): FinanceOverviewStats {
  return {
    monthlyRevenue: 0,
    monthlyRevenueMomPct: 0,
    monthlyWithdrawals: 0,
    monthLabel: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
    platformBalance: 0,
    totalInvestors: 0,
    avgPortfolio: 0,
    cumulativeReturns: 0,
    cashflow: [],
  }
}

function emptyAdminReports(): AdminReportsData {
  return {
    kpis: {
      totalRevenue: 0,
      ytdRevenue: 0,
      revenueYoyPct: 0,
      ordersTotal: 0,
      ordersYoyPct: 0,
      activeBuyers: 0,
      buyersTotal: 0,
      buyersYoyPct: 0,
      shipmentsTotal: 0,
      shipmentsYoyPct: 0,
    },
    businessStats: {
      totalRevenueYtd: 0,
      totalProfitYtd: 0,
      profitMarginPct: 0,
      totalOrders: 0,
      activeBuyers: 0,
      countriesReached: 0,
      productsCatalogued: 0,
      productsApproved: 0,
      onTimeDeliveryPct: 0,
      avgLeadTimeDays: 0,
      customerSatisfaction: 0,
      complianceRatePct: 0,
      revenueYoyPct: 0,
      ordersYoyPct: 0,
      buyersYoyPct: 0,
    },
    logistics: {
      totalShipments: 0,
      inTransit: 0,
      delivered: 0,
      onTimeRatePct: 0,
    },
    investmentsByType: [],
    revenueTrend: [],
    quarterlyRevenue: [],
  }
}

function defaultSettings(): AdminSettings {
  return {
    siteName: "OG Exports",
    tagline: "From Pakistan to The World",
    supportEmail: "support@ogexports.co",
    whatsapp: "+92-300-1234567",
    maintenanceMode: false,
    registrationOpen: true,
    kycRequired: true,
    investmentOpen: true,
    investmentModuleEnabled: true,
    supplierModuleEnabled: true,
    adminOtpEnabled: false,
    investPlantVisible: false,
    investFeedsVisible: false,
    investRicemillVisible: false,
    investYellowMaizeVisible: false,
    investProduceVisible: false,
    investPkrDisplayEnabled: true,
    investDualCurrencyEnabled: false,
    supplierPkrDisplayEnabled: true,
    buyerPkrDisplayEnabled: true,
    currency: "USD",
    minInvestment: 5000,
    paymentMethods: [
      { id: "lc", name: "Irrevocable LC at Sight", enabled: true, priority: 1, desc: "Preferred method for all international trade" },
      { id: "att", name: "Advance TT (100%)", enabled: true, priority: 2, desc: "Full payment before shipment" },
      { id: "ptt", name: "Partial TT (30% + Balance LC)", enabled: true, priority: 3, desc: "Admin approved structured TT" },
      { id: "sblc", name: "SBLC (Standby Letter of Credit)", enabled: true, priority: 4, desc: "For approved high-volume buyers" },
      { id: "usdt", name: "USDT (Crypto)", enabled: false, priority: 5, desc: "Currently suspended — under review" },
    ],
    notifications: { emailOnOrder: true, emailOnDeposit: true, smsOnKYC: true, whatsappAlerts: true },
  }
}

const fmtDate = (d?: string | Date | null) => {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const fmtDateTime = (d?: string | Date | null) => {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Format amount using ISO currency code (USD → $, PKR → PKR …). */
function money(n: number | string | null | undefined, currency?: string | null): string {
  const num = typeof n === "string" ? parseFloat(n.replace(/[^0-9.-]/g, "")) : Number(n)
  const code = String(currency || settingsCache?.currency || "USD").toUpperCase()
  if (!Number.isFinite(num)) {
    if (code === "USD") return "$0"
    return `${code} 0`
  }
  if (code === "USD") return `$${num.toLocaleString()}`
  if (code === "PKR") return `PKR ${Math.round(num).toLocaleString()}`
  return `${code} ${num.toLocaleString()}`
}

function formatOfferPriceDisplay(priceFob: string, supplierCountry: string, currency?: string, snapshots?: {
  usdAmount?: number | null
  pkrAmount?: number | null
}): string {
  const raw = String(priceFob || "").trim()
  if (!raw) return ""
  const numeric = parseFloat(raw.replace(/[^0-9.-]/g, ""))
  if (!Number.isFinite(numeric)) {
    if (/(PKR|USD|\$|€|AED|SAR|GBP)/i.test(raw)) return raw
    return raw
  }
  const code = String(currency || "").toUpperCase() || (isPakistanCountry(supplierCountry) ? "PKR" : "USD")
  const ctx = {
    country: supplierCountry,
    currency: code,
    displayPkr: isPakistanCountry(supplierCountry),
  }
  return formatUserAmount(numeric, ctx, {
    sourceCurrency: code,
    role: "supplier",
    usdAmount: snapshots?.usdAmount ?? null,
    pkrAmount: snapshots?.pkrAmount ?? null,
  })
}

function parseMoney(s: string | number | undefined | null): number {
  if (typeof s === "number") return s
  if (!s) return 0
  const n = parseFloat(String(s).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

async function silent<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try { return await fn() } catch { return undefined }
}

function onFail(refetch: () => Promise<void>) {
  return () => { void refetch() }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapUser(u: any): AdminUser {
  const profile = u.profile || {}
  const accountStatus = u.accountStatus || u.account_status || "active"
  const latestKyc = u.latestKycApplication || u.latest_kyc_application
  const kycFromMeta = profile.meta?.kyc_status || profile.meta?.kycStatus
  let kycStatus: AdminUser["kycStatus"] = kycFromMeta || "pending"
  if (latestKyc?.status === "approved" || profile.meta?.kyc === true || profile.meta?.kyc_complete === true) {
    kycStatus = "verified"
  } else if (latestKyc?.status === "rejected") {
    kycStatus = "rejected"
  } else if (latestKyc?.status === "review") {
    kycStatus = "review"
  } else if (latestKyc?.status === "pending" && Number(latestKyc.documentCount ?? latestKyc.document_count ?? 0) > 0) {
    kycStatus = "review"
  }
  if (accountStatus === "suspended") kycStatus = "suspended"
  const status: AdminUser["status"] =
    accountStatus === "suspended" ? "suspended"
      : accountStatus === "inactive" || accountStatus === "pending" ? "inactive"
        : "active"

  return {
    id: String(u.id),
    fullName: u.fullName || u.name || "",
    email: u.email || "",
    phone: u.phone || "",
    accountType: (u.accountType || u.account_type || "buyer") as AdminUser["accountType"],
    kycStatus,
    trustScore: Number(profile.trustScore ?? profile.trust_score ?? 0),
    status,
    createdAt: u.createdAt || u.created_at || "",
    country: profile.country,
    company: profile.companyName || profile.company_name,
    category: profile.category,
    rating: profile.rating != null ? Number(profile.rating) : undefined,
    capacity: profile.capacity,
    dept: profile.dept,
    role: Array.isArray(u.roles) ? u.roles[0] : undefined,
    lastSeen: u.lastSeenAt || u.last_seen_at || undefined,
    avatarUrl: profile.avatarUrl || profile.avatar_url,
    kycApplicationId: latestKyc?.id != null ? String(latestKyc.id) : undefined,
    kycDocumentCount: latestKyc?.documentCount != null ? Number(latestKyc.documentCount) : undefined,
    orders: u.ordersCount != null ? Number(u.ordersCount) : (u.orders_count != null ? Number(u.orders_count) : undefined),
    orderValue: u.orderValueTotal != null || u.order_value_total != null
      ? formatUserAmount(
          Number(u.orderValueTotal ?? u.order_value_total ?? 0),
          userCurrencyContextFromApi({ country: profile.country, display_pkr: u.displayPkr ?? u.display_pkr, currency: u.displayCurrency ?? u.display_currency, wallet_currency: u.walletCurrency ?? u.wallet?.currency }),
          { sourceCurrency: "USD", role: "buyer" },
        )
      : undefined,
    portfolio: u.portfolioTotal != null || u.portfolio_total != null
      ? formatUserAmount(
          Number(u.portfolioTotal ?? u.portfolio_total ?? 0),
          userCurrencyContextFromApi({
            ...u,
            country: profile.country,
            profile_currency: u.profileCurrency ?? u.profile_currency,
            display_pkr: u.displayPkr ?? u.display_pkr,
            wallet_currency: u.walletCurrency ?? u.wallet_currency ?? u.wallet?.currency,
          }),
          { sourceCurrency: u.walletCurrency ?? u.wallet_currency ?? u.wallet?.currency ?? u.profileCurrency ?? u.profile_currency ?? u.currency ?? u.displayCurrency ?? u.display_currency ?? "USD", nativeAmount: Number(u.portfolioTotal ?? u.portfolio_total ?? 0), role: "investor" },
        )
      : undefined,
  }
}

function mapOrder(o: any): AdminOrder {
  const items = o.items || []
  const first = items[0]
  const product = first?.product_name || first?.product?.name || o.product_name || "—"
  const qty = first != null ? String(first.qty ?? "—") : "—"
  const displayId = o.order_number || String(o.id)
  if (o.id != null) {
    orderDbIdByKey.set(displayId, String(o.id))
    orderDbIdByKey.set(String(o.id), String(o.id))
  }
  const destination = o.destination || o.country?.name || "—"
  const destinationPort = o.destination_port || o.port?.name || ""
  const paymentMethod = o.payment_method ? String(o.payment_method) : ""
  const paymentStatus = o.payment_status ? String(o.payment_status) : ""
  const paymentNotes = o.notes != null && o.notes !== "" ? String(o.notes) : ""
  const currency = String(o.currency || settingsCache?.currency || "USD").toUpperCase()
  const buyerCtx = userCurrencyContextFromApi(o.buyer)
  return {
    id: displayId,
    buyer: o.buyer?.name || o.buyer_name || "—",
    product,
    qty,
    value: formatUserAmount(o.total_value ?? o.totalValue, buyerCtx, {
      sourceCurrency: currency,
      role: "buyer",
      usdAmount: o.total_value_usd ?? o.totalValueUsd ?? null,
      pkrAmount: o.total_value_pkr ?? o.totalValuePkr ?? null,
    }),
    currency,
    status: normalizeOrderStatus(o.status),
    payment: paymentMethod || paymentStatus || "—",
    paymentMethod: paymentMethod || undefined,
    paymentStatus: paymentStatus || undefined,
    paymentNotes: paymentNotes || undefined,
    date: fmtDate(o.placed_at || o.created_at),
    pm: o.pm || o.assignee?.name || "—",
    destination: destinationPort ? `${destination} / ${destinationPort}` : destination,
    destinationPort: destinationPort || undefined,
    incoterm: o.incoterm || undefined,
    requiredDeliveryDate: o.required_delivery_date ? fmtDate(o.required_delivery_date) : undefined,
    statusTimeline: (o.status_timeline && typeof o.status_timeline === "object")
      ? o.status_timeline
      : undefined,
  }
}

function mapRfqStatus(s: string): AdminRFQ["status"] {
  const v = String(s || "").toLowerCase()
  if (v === "quoted") return "quoted"
  if (v === "converted" || v === "accepted") return "converted"
  if (v === "expired") return "expired"
  return "new" // pending / new
}

function mapRfq(r: any): AdminRFQ {
  return {
    id: String(r.id),
    buyer: r.buyer?.name || r.buyer_name || "—",
    product: r.product_name || r.product?.name || "—",
    qty: String(r.qty ?? "—"),
    destination: r.destination || "—",
    status: mapRfqStatus(r.status),
    submitted: fmtDate(r.submitted_at || r.created_at),
    incoterm: r.incoterm || undefined,
    paymentTerms: r.payment_terms || undefined,
    requiredDeliveryDate: r.required_delivery_date ? fmtDate(r.required_delivery_date) : undefined,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  }
}

function mapQuotation(q: any): AdminQuotation {
  const total = (Number(q.qty_mt) || 0) * (Number(q.fob_unit_price) || 0)
    + (Number(q.freight) || 0) + (Number(q.insurance) || 0) + (Number(q.doc_fee) || 0)
  const statusRaw = String(q.status || "draft").toLowerCase()
  const status: AdminQuotation["status"] =
    statusRaw === "accepted" ? "accepted"
      : statusRaw === "expired" ? "expired"
        : statusRaw === "sent" ? "sent"
          : "draft"
  return {
    id: String(q.id),
    rfq: q.rfq_id != null ? String(q.rfq_id) : (q.rfq?.id != null ? String(q.rfq.id) : "—"),
    buyer: q.buyer?.name || q.buyer_name || "—",
    product: q.product_name || "—",
    totalValue: formatUserAmount(total, userCurrencyContextFromApi(q.buyer), { sourceCurrency: "USD", role: "buyer" }),
    validUntil: fmtDate(q.valid_until),
    status,
    terms: q.payment_terms || "—",
  }
}

function mapBuyerQuote(q: any): BuyerQuote {
  const statusRaw = String(q.status || "draft").toLowerCase()
  let status: BuyerQuote["status"] = "pending_admin"
  if (statusRaw === "sent") status = "sent"
  else if (statusRaw === "accepted") status = "accepted"
  else if (statusRaw === "rejected") status = "rejected"
  else if (statusRaw === "draft" || statusRaw === "pending") status = "pending_admin"

  return {
    id: String(q.id),
    rfqId: q.rfq_id != null ? String(q.rfq_id) : "",
    buyer: q.buyer?.name || q.buyer_name || "—",
    product: q.product_name || "—",
    qtyMT: Number(q.qty_mt) || 0,
    incoterm: q.incoterm || "FOB",
    destination: q.destination || "",
    paymentTerms: q.payment_terms || "",
    requiredDeliveryDate: q.rfq?.required_delivery_date
      ? fmtDate(q.rfq.required_delivery_date)
      : (q.required_delivery_date ? fmtDate(q.required_delivery_date) : undefined),
    date: fmtDate(q.issued_at || q.created_at),
    validUntil: q.valid_until ? fmtDate(q.valid_until) : "—",
    status,
    source: (q.source === "auto-fob" ? "auto-fob" : "admin") as BuyerQuote["source"],
    fobUnitPrice: Number(q.fob_unit_price) || 0,
    freight: Number(q.freight) || 0,
    insurance: Number(q.insurance) || 0,
    docFee: Number(q.doc_fee) || 0,
    notes: q.notes || "",
  }
}

function mapDeposit(d: any): AdminDeposit {
  const raw = String(d.status || "pending").toLowerCase()
  const status: AdminDeposit["status"] =
    raw === "approved" ? "approved"
      : raw === "rejected" ? "rejected"
        : raw === "cancelled" || raw === "canceled" ? "cancelled"
          : "pending"
  const proofPath = d.proof_path || d.proofPath || ""
  const proofUrl = d.proof_url || d.proofUrl || (proofPath ? resolveMediaUrl(proofPath) : undefined)
  const investorCtx = userCurrencyContextFromApi(d.investor)
  const depositCurrency = String(d.currency || "USD").toUpperCase()
  const walletCurrency = String(d.wallet_currency || d.walletCurrency || investorCtx?.walletCurrency || "").toUpperCase()
  const displayAmount = d.status === "approved" && d.converted_amount != null && walletCurrency === "PKR"
    ? Number(d.converted_amount)
    : Number(d.amount)
  const displaySource = d.status === "approved" && d.converted_amount != null && walletCurrency === "PKR"
    ? walletCurrency
    : depositCurrency
  const originalUsd = depositCurrency === "USD" ? Number(d.amount) : null
  return {
    id: String(d.id),
    investor: d.investor?.name || d.investor_name || "—",
    email: d.investor?.email || d.email || "",
    amount: formatUserAmount(displayAmount, investorCtx, {
      sourceCurrency: displaySource,
      convertedAmount: d.converted_amount ?? d.convertedAmount,
      walletCurrency,
      usdAmount: originalUsd,
      pkrAmount: walletCurrency === "PKR" && d.converted_amount != null
        ? Number(d.converted_amount)
        : undefined,
    }),
    method: d.method || "Bank Transfer",
    ref: d.reference || d.ref || "",
    bankRef: d.bank_reference || d.bankReference || d.bank_ref || "",
    date: fmtDate(d.created_at),
    status,
    note: d.note || "",
    proofPath: proofPath || undefined,
    proofUrl: proofUrl || undefined,
    adminBankName: d.admin_bank_account?.bank_name || d.bank_account_name || d.bankAccountName || undefined,
    adminAccountNumber: d.admin_bank_account?.account_number || d.bank_account?.account_number || undefined,
  }
}

function mapBuyerDeposit(o: any): AdminBuyerDeposit {
  const raw = String(o.review_status || o.payment_status || "pending").toLowerCase()
  const status: AdminBuyerDeposit["status"] =
    raw === "approved" || raw === "paid" || raw === "partial" ? "approved"
      : raw === "rejected" ? "rejected"
        : raw === "cancelled" || raw === "canceled" ? "cancelled"
          : "pending"
  return {
    id: String(o.id),
    orderNumber: o.order_number || `ORD-${o.id}`,
    buyer: o.buyer?.name || o.buyer_name || "—",
    email: o.buyer?.email || o.email || "",
    amount: formatUserAmount(o.amount ?? o.total_value, userCurrencyContextFromApi(o.buyer), {
      sourceCurrency: o.currency || "USD",
      role: "buyer",
      usdAmount: o.total_value_usd ?? o.totalValueUsd ?? o.amount_usd ?? null,
      pkrAmount: o.total_value_pkr ?? o.totalValuePkr ?? o.amount_pkr ?? null,
    }),
    method: o.payment_method || "—",
    field1Label: o.payment_field1_label || "",
    field1Value: o.payment_field1_value || "",
    field2Label: o.payment_field2_label || "",
    field2Value: o.payment_field2_value || "",
    ref: o.payment_reference || o.payment_field2_value || "",
    details: o.details_summary
      || [o.payment_field1_label && o.payment_field1_value ? `${o.payment_field1_label}: ${o.payment_field1_value}` : "",
        o.payment_field2_label && o.payment_field2_value ? `${o.payment_field2_label}: ${o.payment_field2_value}` : ""]
        .filter(Boolean).join(" · ")
      || "—",
    date: fmtDate(o.payment_submitted_at || o.updated_at || o.created_at),
    status,
    product: o.product || "—",
  }
}

function mapWithdrawal(w: any): AdminWithdrawal {
  const bankDetails = typeof w.bank_details === "object" && w.bank_details ? w.bank_details as Record<string, string> : {}
  const bank = bankDetails.bank_name || bankDetails.bank || bankDetails.name || w.bank || "—"
  const statusRaw = String(w.status || "pending")
  const status: AdminWithdrawal["status"] =
    statusRaw === "approved" ? "approved"
      : statusRaw === "rejected" ? "rejected"
        : statusRaw === "review" ? "review"
          : "pending"
  const withdrawId = w.reference || w.ref || `OGWITH-INV-${String(w.id).padStart(3, "0")}`
  const investorCtx = userCurrencyContextFromApi(w.investor)
  const walletCurrency = String(w.wallet_currency || w.walletCurrency || investorCtx?.walletCurrency || "USD").toUpperCase()
  return {
    id: String(w.id),
    investor: w.investor?.name || w.investor_name || "—",
    amount: formatUserAmount(w.amount, investorCtx, {
      sourceCurrency: walletCurrency,
      nativeAmount: Number(w.amount),
    }),
    bank: String(bank),
    ref: withdrawId,
    requested: fmtDate(w.created_at),
    status,
    note: w.note || "",
    bankDetails,
  }
}

function mapTransaction(t: any): AdminTransaction {
  const userName = t.wallet?.user?.name || t.user?.name || t.user_name || "—"
  const walletUser = t.wallet?.user || t.user
  const userCtx = userCurrencyContextFromApi(walletUser)
  const walletCurrency = String(t.wallet?.currency || userCtx?.walletCurrency || "USD").toUpperCase()
  const dir = String(t.direction || "").toLowerCase()
  const amt = Number(t.amount) || 0
  const signed = dir === "debit" ? -Math.abs(amt) : Math.abs(amt)
  const formatted = formatUserAmount(Math.abs(amt), userCtx, {
    sourceCurrency: walletCurrency,
    nativeAmount: Math.abs(amt),
  })
  const type = t.type ? String(t.type).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Transaction"
  const statusRaw = String(t.status || "completed").toLowerCase()
  return {
    id: String(t.id),
    type,
    user: userName,
    amount: `${signed >= 0 ? "+" : "-"}${formatted}`,
    date: fmtDate(t.created_at),
    method: t.reference || "System",
    status: statusRaw === "pending" ? "pending" : statusRaw === "rejected" ? "rejected" : "completed",
  }
}

function mapAdminProduct(p: any): AdminProduct {
  const mapped = mapProduct(p)
  if (!mapped) {
    return {
      id: String(p?.id ?? ""),
      name: "", category: "", categoryId: null, sku: "", price: "", minOrder: "", origin: "",
      status: "draft", stock: "", rating: 0, orders: 0,
    }
  }
  const stockNum = Number(mapped.stock)
  let stockLabel = String(mapped.stock ?? "")
  if (Number.isFinite(stockNum)) {
    if (stockNum <= 0) stockLabel = "Out of Stock"
    else if (stockNum <= 25) stockLabel = "Limited"
    else if (stockNum <= 50) stockLabel = "Seasonal"
    else stockLabel = "Available"
  }
  return {
    ...mapped,
    status: (mapped.status as AdminProduct["status"]) || "pending",
    stock: stockLabel,
    categoryId: mapped.categoryId ?? null,
  }
}

function toIsoDate(d?: string | Date | null): string {
  if (!d) return ""
  if (typeof d === "string") {
    const m = d.match(/^(\d{4}-\d{2}-\d{2})/)
    if (m) return m[1]
  }
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ""
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}

function mapShipment(s: any): AdminShipment {
  const statusRaw = String(s.status || "pending").toLowerCase().replace("_", "-")
  const statusMap: Record<string, AdminShipment["status"]> = {
    pending: "pending", booking: "booking", "in-transit": "in-transit",
    transit: "in-transit", arrived: "arrived", delivered: "delivered",
  }
  const docsRaw = Array.isArray(s.trade_documents)
    ? s.trade_documents
    : Array.isArray(s.tradeDocuments)
      ? s.tradeDocuments
      : Array.isArray(s.documents)
        ? s.documents
        : []
  const order = s.order
  const orderId = s.order_id != null
    ? Number(s.order_id)
    : (order?.id != null ? Number(order.id) : null)
  const paymentMethod = order?.payment_method ? String(order.payment_method) : ""
  const paymentStatus = order?.payment_status ? String(order.payment_status) : ""
  const paymentNotes = order?.notes != null && order.notes !== "" ? String(order.notes) : ""
  return {
    id: String(s.id),
    order: order?.order_number || (s.order_id != null ? String(s.order_id) : "—"),
    orderId: Number.isFinite(orderId as number) ? orderId : null,
    buyer: s.buyer?.name || "—",
    product: s.product_snapshot || s.product || "—",
    vessel: s.vessel || "—",
    container: s.container || "—",
    origin: s.origin || "—",
    destination: s.destination || "—",
    line: s.shipping_line || s.line || "—",
    etd: fmtDate(s.etd),
    eta: fmtDate(s.eta),
    etdIso: toIsoDate(s.etd),
    etaIso: toIsoDate(s.eta),
    status: statusMap[statusRaw] || "pending",
    milestone: s.current_milestone || s.milestone || "—",
    paymentMethod: paymentMethod || undefined,
    paymentStatus: paymentStatus || undefined,
    paymentNotes: paymentNotes || undefined,
    documents: Array.from(
      indexDocumentsByType(
        docsRaw.map((d: any) => ({
          id: Number(d.id),
          type: d.type || "Other",
          title: d.title || d.type || "Document",
          path: d.path || "",
          url: d.url || (d.path ? resolveMediaUrl(d.path) : undefined),
        })),
      ).values(),
    ),
  }
}

function mapKycDocument(d: any, kycId?: string | number): AdminKycDocument {
  const id = Number(d.id)
  const path = d.path || ""
  const publicUrl = d.url || d.view_url || d.viewUrl || (path ? resolveMediaUrl(path) : undefined)
  return {
    id,
    docType: d.doc_type || d.docType || d.type || "document",
    label: d.label || d.doc_type || d.type || d.name || "Document",
    path,
    originalName: d.original_name || d.originalName,
    url: publicUrl || undefined,
    viewUrl: publicUrl || undefined,
    downloadUrl: d.download_url || d.downloadUrl || publicUrl || undefined,
  }
}

function mapKyc(k: any): AdminKYC {
  const documents = Array.isArray(k.documents)
    ? k.documents.map((d: any) => mapKycDocument(d, k.id))
    : []
  const docs = documents.map(d => d.label)
  const statusRaw = String(k.status || "pending").toLowerCase()
  const status: AdminKYC["status"] =
    statusRaw === "approved" ? "approved"
      : statusRaw === "rejected" ? "rejected"
        : statusRaw === "review" ? "review"
          : documents.length > 0 ? "review"
            : "pending"
  const riskRaw = String(k.risk_level || k.risk || "low").toLowerCase()
  return {
    id: String(k.id),
    userId: String(k.user_id || k.user?.id || ""),
    name: k.user?.name || k.name || "—",
    type: (k.type === "company" ? "company" : "individual") as AdminKYC["type"],
    country: k.country || k.user?.profile?.country || "—",
    submitted: fmtDate(k.submitted_at || k.created_at),
    docs,
    documents,
    status,
    risk: (["low", "medium", "high"].includes(riskRaw) ? riskRaw : "low") as AdminKYC["risk"],
    notes: k.notes || undefined,
  }
}

function mapAml(a: any): AdminAMLAlert {
  const statusRaw = String(a.status || "open").toLowerCase()
  const status: AdminAMLAlert["status"] =
    statusRaw === "investigating" ? "investigating"
      : statusRaw === "resolved" || statusRaw === "dismissed" ? "resolved"
        : "open"
  const sev = String(a.severity || "medium").toLowerCase()
  return {
    id: String(a.id),
    severity: (["high", "medium", "low"].includes(sev) ? sev : "medium") as AdminAMLAlert["severity"],
    user: a.user?.name || a.user_name || "—",
    type: a.type || a.alert_type || "Alert",
    amount: a.amount != null
      ? formatUserAmount(a.amount, userCurrencyContextFromApi(a.user), { sourceCurrency: a.currency || "USD" })
      : "—",
    flagged: fmtDate(a.flagged_at || a.created_at),
    details: a.details || a.description || "",
    status,
  }
}

function mapTicket(t: any): AdminTicket {
  const msgs = Array.isArray(t.messages)
    ? t.messages.map((m: any): AdminTicketMsg => ({
      from: m.user?.name || (m.is_admin ? "OG Exports Admin" : "User"),
      text: m.body || m.text || "",
      time: fmtDateTime(m.created_at),
      isAdmin: Boolean(m.is_admin ?? m.isAdmin),
    }))
    : []
  const typeRaw = String(t.user_type || t.type || "buyer").toLowerCase()
  const statusRaw = String(t.status || "open").toLowerCase()
  const statusMap: Record<string, AdminTicket["status"]> = {
    open: "open", escalated: "escalated", pending: "pending",
    answered: "pending", resolved: "resolved", closed: "closed",
  }
  return {
    id: String(t.id),
    ticketNumber: t.ticket_number || t.ticketNumber || `TK-${t.id}`,
    subject: t.subject || "",
    user: t.user?.name || "—",
    type: (["buyer", "investor", "supplier"].includes(typeRaw) ? typeRaw : "buyer") as AdminTicket["type"],
    priority: (["high", "medium", "low"].includes(String(t.priority).toLowerCase())
      ? String(t.priority).toLowerCase()
      : "medium") as AdminTicket["priority"],
    status: statusMap[statusRaw] || "open",
    assignee: t.assignee?.name || "—",
    created: fmtDate(t.created_at),
    lastReply: fmtDateTime(t.updated_at || t.last_reply_at),
    msgs: msgs.length || Number(t.messages_count) || 0,
    messages: msgs,
    contactName: t.contact_name || t.contactName,
    contactEmail: t.contact_email || t.contactEmail,
    contactPhone: t.contact_phone || t.contactPhone,
  }
}

function mapLead(l: any): AdminCRMLead {
  return {
    id: String(l.id),
    name: l.name || "—",
    country: l.country || "—",
    value: formatLeadValue(l.value, l.country),
    product: l.product || "—",
    contact: l.contact || l.email || "—",
    date: fmtDate(l.created_at).replace(/, \d{4}$/, "") || "—",
    stage: l.stage || "New Lead",
  }
}

function mapActivity(a: any, leadName?: string): AdminCRMActivity {
  return {
    id: String(a.id),
    lead: leadName || a.lead_name || a.lead?.name || "—",
    type: a.type || "Note",
    note: a.note || "",
    time: fmtDateTime(a.occurred_at || a.created_at),
    user: a.user?.name || a.admin?.name || "—",
  }
}

export function mapInvestProject(p: any): AdminInvestProject {
  const targetRaw = p.target_amount ?? p.target
  const raisedRaw = p.raised_amount ?? p.raised
  const investorsRaw = p.investors_count ?? p.investors
  const asAvailableNumber = (value: unknown) => {
    if (value == null || String(value).trim() === "") return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  const targetValue = asAvailableNumber(targetRaw)
  const raisedValue = asAvailableNumber(raisedRaw)
  const investorCount = asAvailableNumber(investorsRaw)
  const rawCurrency = p.currency ?? p.currency_code ?? p.amount_currency
  const currency = rawCurrency == null ? "" : String(rawCurrency).trim().toUpperCase()
  const typeRaw = String(p.type || "container").toLowerCase()
  const type: AdminInvestProject["type"] =
    typeRaw === "cold_storage" || typeRaw.includes("cold_storage") ? "cold_storage"
      : typeRaw === "domestic_trading" || typeRaw.includes("domestic_trading") ? "domestic_trading"
        : typeRaw === "ricemill" || typeRaw.includes("rice_mill") ? "ricemill"
      : typeRaw === "feed" || typeRaw.includes("feed_mill") ? "feed"
        : typeRaw.includes("produce") || typeRaw === "fp" ? "produce"
          : typeRaw.includes("plant") || typeRaw === "pp" ? "plant"
            : "container"
  const statusRaw = String(p.status || "").toLowerCase()
  const status: AdminInvestProject["status"] = type === "container"
    ? (statusRaw ? normalizeContainerProjectStatus(statusRaw) : "cancelled") as ContainerProjectStatus
    : statusRaw === "draft" ? "draft"
      : statusRaw === "coming_soon" ? "coming_soon"
        : statusRaw === "fully_funded" ? "fully_funded"
          : statusRaw === "under_construction" ? "under_construction"
            : statusRaw === "operational" ? "operational"
              : statusRaw === "completed" ? "completed"
                : statusRaw === "closed" || statusRaw === "cancelled" || statusRaw === "canceled" ? "closed"
                  : statusRaw === "active" || statusRaw === "funded" || statusRaw === "ready_to_ship" || statusRaw === "shipping" ? "active"
                    : "closed"
  return {
    id: String(p.id),
    title: p.title || "—",
    reference: p.reference || undefined,
    type,
    tradeDirection: (() => {
      const direction = String(p.trade_direction || p.tradeDirection || "").trim().toLowerCase()
      return direction === "import" ? "import" : direction === "export" ? "export" : undefined
    })(),
    target: targetValue ?? 0,
    raised: raisedValue ?? 0,
    investors: investorCount ?? 0,
    targetAmountAvailable: targetValue !== undefined,
    raisedAmountAvailable: raisedValue !== undefined,
    investorCountAvailable: investorCount !== undefined,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : undefined,
    status,
    roi: p.roi_label || (p.expected_return_pct != null ? `${p.expected_return_pct}%` : "—"),
    location: p.location,
    vessel: p.vessel,
    etd: p.etd ? fmtDate(p.etd) : undefined,
    eta: p.eta ? fmtDate(p.eta) : undefined,
    imagePath: toStoredMediaPath(p.image_url || p.imageUrl) || undefined,
    imageUrl: resolveMediaUrl(toStoredMediaPath(p.image_url || p.imageUrl) || p.image_url || p.imageUrl) || undefined,
    description: p.description,
    commodity: p.commodity,
    variety: p.variety,
    containerType: p.container_type,
    containerNumber: (() => {
      const meta = p.meta && typeof p.meta === "object" ? p.meta : {}
      const raw = meta.container_no ?? meta.container_number ?? meta.containerNumber
      return raw != null && String(raw).trim() !== "" ? String(raw).trim() : undefined
    })(),
    containerValue: asAvailableNumber(p.container_value),
    minInvestment: asAvailableNumber(p.min_investment),
    maxInvestment: asAvailableNumber(p.max_investment) ?? null,
    destination: p.destination,
    destinationFlag: p.destination_flag,
    destinationCountry: p.destination_country,
    portOfLoading: p.port_of_loading,
    portOfDischarge: p.port_of_discharge,
    origin: p.origin,
    incoterm: p.incoterm,
    paymentTermsInvest: p.payment_terms,
    riskLevel: p.risk_level,
    fundingDeadlineDate: p.funding_deadline,
    investmentPeriodDays: p.investment_period_days != null ? Number(p.investment_period_days) : undefined,
    expectedReturnPct: p.expected_return_pct != null ? Number(p.expected_return_pct) : undefined,
    targetDistributionDate: String(
      p.target_distribution_date
        ?? p.targetDistributionDate
        ?? p.meta?.target_distribution_date
        ?? p.meta?.estimated_distribution_date
        ?? "",
    ).slice(0, 10),
    currentProjectStage: p.current_project_stage,
    shippingLine: p.shipping_line,
    completion: p.meta?.completion != null ? String(p.meta.completion) : (p.completion || undefined),
    productCategory: p.meta?.product_category != null ? String(p.meta.product_category) : (p.productCategory || undefined),
    timeline: p.meta?.timeline != null ? String(p.meta.timeline) : (p.timeline || undefined),
    sortOrder: p.meta?.sort_order != null ? Number(p.meta.sort_order) : (p.sortOrder != null ? Number(p.sortOrder) : undefined),
    createdAt: p.created_at || undefined,
    meta: p.meta && typeof p.meta === "object" ? p.meta : undefined,
    pendingReserved: p.pending_reserved != null ? Number(p.pending_reserved) : undefined,
    pendingCount: p.pending_count != null ? Number(p.pending_count) : undefined,
    fundingPercentage: asAvailableNumber(p.funding_percentage ?? p.fundingPercentage),
    remainingAmount: p.remaining_amount != null ? Number(p.remaining_amount) : undefined,
    isFull: Boolean(p.is_full),
    slotsRemaining: p.slots_remaining != null ? Number(p.slots_remaining) : undefined,
    documents: Array.isArray(p.documents)
      ? p.documents.map((d: any) => ({
          id: Number(d.id),
          title: d.title || d.name || "Document",
          name: d.title || d.name || "Document",
          size: d.size || "—",
          sizeBytes: d.size_bytes != null ? Number(d.size_bytes) : undefined,
          originalName: d.original_name,
          path: d.path,
          url: d.url || (d.path ? resolveMediaUrl(d.path) : undefined),
          downloadUrl: d.download_url || d.downloadUrl || d.url || (d.path ? resolveMediaUrl(d.path) : undefined),
        }))
      : [],
  }
}

function mapAudit(a: any): AdminAuditLog {
  return {
    id: String(a.id),
    actor: a.actor?.email || a.user?.email || a.actor_email || a.actor || "system",
    action: a.action || a.description || "—",
    module: a.module || a.entity || "—",
    ip: a.ip_address || a.ip || "—",
    timestamp: fmtDateTime(a.created_at),
  }
}

function mapOffer(o: any): SupplierOffer {
  const notes = Array.isArray(o.notes)
    ? o.notes.map((n: any): SupplierOfferNote => ({
      text: n.text || "",
      at: fmtDateTime(n.created_at),
    }))
    : []
  const supplierCountry = o.supplier_country || o.supplier?.profile?.country || "Pakistan"
  const currency = o.currency || (String(supplierCountry).toLowerCase() === "pakistan" ? "PKR" : "USD")
  return {
    id: String(o.id),
    supplierId: String(o.supplier_id ?? o.supplier?.id ?? ""),
    supplierName: o.supplier?.name || o.supplier_name || o.supplier?.profile?.company_name || "—",
    supplierCountry,
    supplierVerified: Boolean(o.supplier_verified ?? o.supplier?.email_verified_at),
    category: o.category || "",
    productName: o.product_name || "",
    origin: o.origin || "",
    specifications: o.specifications,
    availableQty: o.available_qty || "",
    priceFob: formatOfferPriceDisplay(o.price_fob || "", supplierCountry, currency, {
      usdAmount: o.line_value_usd ?? o.lineValueUsd ?? null,
      pkrAmount: o.line_value_pkr ?? o.lineValuePkr ?? null,
    }),
    currency,
    incoterm: o.incoterm,
    priceUnit: o.price_unit,
    moq: o.moq || "",
    leadTime: o.lead_time || "",
    packaging: o.packaging || "",
    paymentTerms: o.payment_terms || "",
    certifications: Array.isArray(o.certifications) ? o.certifications : [],
    validUntil: o.valid_until ? fmtDate(o.valid_until) : "",
    hsCode: o.hs_code,
    remarks: o.remarks || undefined,
    status: (["pending", "approved", "rejected", "hold"].includes(o.status) ? o.status : "pending") as SupplierOffer["status"],
    rating: o.rating != null ? Number(o.rating) : undefined,
    notes,
    submittedAt: o.submitted_at ? String(o.submitted_at).slice(0, 10) : fmtDate(o.created_at),
    images: normalizeOfferImages(o.images),
    video: o.video ? (toStoredMediaPath(o.video) || String(o.video)) : undefined,
  }
}

function normalizeOfferImages(raw: unknown): string[] | undefined {
  let list: unknown[] = []
  if (Array.isArray(raw)) {
    list = raw
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) list = parsed
      else list = [raw]
    } catch {
      list = [raw]
    }
  }
  const paths = list
    .map((item) => {
      if (typeof item === "string") return toStoredMediaPath(item) || item
      if (item && typeof item === "object") {
        const p = (item as any).path || (item as any).url
        return p ? (toStoredMediaPath(String(p)) || String(p)) : ""
      }
      return ""
    })
    .filter(Boolean)
  return paths.length ? paths : undefined
}

function mapFob(f: any): FobPrice {
  const product = f.product_name || f.product?.name || f.product || ""
  if (f.id != null) fobIdByProduct.set(product, String(f.id))
  return {
    product,
    price: Number(f.price_per_mt ?? f.price) || 0,
    updatedAt: fmtDate(f.updated_at || f.created_at),
  }
}

function mapPlatformSettings(raw: any): AdminSettings {
  const base = defaultSettings()
  if (!raw) return base
  const prefs = raw.notification_prefs || raw.notifications || {}
  let paymentMethods = base.paymentMethods
  if (Array.isArray(raw.payment_methods)) {
    if (raw.payment_methods.length && typeof raw.payment_methods[0] === "object") {
      paymentMethods = raw.payment_methods.map((pm: any, i: number) => ({
        id: pm.id || `pm-${i}`,
        name: pm.name || String(pm),
        enabled: pm.enabled !== false,
        priority: pm.priority ?? i + 1,
        desc: pm.desc || pm.description || "",
      }))
    } else {
      paymentMethods = raw.payment_methods.map((name: string, i: number) => ({
        id: `pm-${i}`,
        name: String(name),
        enabled: true,
        priority: i + 1,
        desc: "",
      }))
    }
  }
  return {
    siteName: raw.site_name || raw.siteName || base.siteName,
    tagline: raw.tagline || base.tagline,
    supportEmail: raw.support_email || raw.supportEmail || base.supportEmail,
    whatsapp: raw.whatsapp || base.whatsapp,
    maintenanceMode: Boolean(raw.maintenance_mode ?? raw.maintenanceMode),
    registrationOpen: raw.registration_open !== undefined ? Boolean(raw.registration_open) : base.registrationOpen,
    kycRequired: raw.kyc_required !== undefined ? Boolean(raw.kyc_required) : base.kycRequired,
    investmentOpen: raw.investment_open !== undefined ? Boolean(raw.investment_open) : base.investmentOpen,
    investmentModuleEnabled: raw.investment_module_enabled !== undefined
      ? Boolean(raw.investment_module_enabled)
      : (raw.investmentModuleEnabled !== undefined ? Boolean(raw.investmentModuleEnabled) : base.investmentModuleEnabled),
    supplierModuleEnabled: raw.supplier_module_enabled !== undefined
      ? Boolean(raw.supplier_module_enabled)
      : (raw.supplierModuleEnabled !== undefined ? Boolean(raw.supplierModuleEnabled) : base.supplierModuleEnabled),
    adminOtpEnabled: raw.admin_otp_enabled !== undefined
      ? Boolean(raw.admin_otp_enabled)
      : (raw.adminOtpEnabled !== undefined ? Boolean(raw.adminOtpEnabled) : base.adminOtpEnabled),
    investPlantVisible: raw.invest_plant_visible !== undefined
      ? Boolean(raw.invest_plant_visible)
      : (raw.investPlantVisible !== undefined ? Boolean(raw.investPlantVisible) : base.investPlantVisible),
    investFeedsVisible: raw.invest_feeds_visible !== undefined
      ? Boolean(raw.invest_feeds_visible)
      : (raw.investFeedsVisible !== undefined ? Boolean(raw.investFeedsVisible) : base.investFeedsVisible),
    investRicemillVisible: raw.invest_ricemill_visible !== undefined
      ? Boolean(raw.invest_ricemill_visible)
      : (raw.investRicemillVisible !== undefined ? Boolean(raw.investRicemillVisible) : base.investRicemillVisible),
    investYellowMaizeVisible: raw.invest_yellow_maize_visible !== undefined
      ? Boolean(raw.invest_yellow_maize_visible)
      : (raw.investYellowMaizeVisible !== undefined ? Boolean(raw.investYellowMaizeVisible) : base.investYellowMaizeVisible),
    investProduceVisible: raw.invest_produce_visible !== undefined
      ? Boolean(raw.invest_produce_visible)
      : (raw.investProduceVisible !== undefined ? Boolean(raw.investProduceVisible) : base.investProduceVisible),
    investPkrDisplayEnabled: parsePlatformBool(
      raw.invest_pkr_display_enabled !== undefined
        ? raw.invest_pkr_display_enabled
        : raw.investPkrDisplayEnabled,
      base.investPkrDisplayEnabled,
    ),
    investDualCurrencyEnabled: parsePlatformBool(
      raw.invest_dual_currency_enabled !== undefined
        ? raw.invest_dual_currency_enabled
        : raw.investDualCurrencyEnabled,
      base.investDualCurrencyEnabled,
    ),
    supplierPkrDisplayEnabled: parsePlatformBool(
      raw.supplier_pkr_display_enabled !== undefined
        ? raw.supplier_pkr_display_enabled
        : raw.supplierPkrDisplayEnabled,
      base.supplierPkrDisplayEnabled,
    ),
    buyerPkrDisplayEnabled: parsePlatformBool(
      raw.buyer_pkr_display_enabled !== undefined
        ? raw.buyer_pkr_display_enabled
        : raw.buyerPkrDisplayEnabled,
      base.buyerPkrDisplayEnabled,
    ),
    currency: raw.currency || base.currency,
    minInvestment: Number(raw.min_investment ?? raw.minInvestment ?? base.minInvestment),
    paymentMethods,
    notifications: {
      emailOnOrder: prefs.emailOnOrder ?? prefs.email ?? true,
      emailOnDeposit: prefs.emailOnDeposit ?? prefs.email ?? true,
      smsOnKYC: prefs.smsOnKYC ?? prefs.sms ?? true,
      whatsappAlerts: prefs.whatsappAlerts ?? prefs.whatsapp ?? true,
    },
  }
}

function productToApi(p: Partial<AdminProduct>) {
  const payload: Record<string, unknown> = {}
  if (p.name !== undefined) payload.name = p.name
  if (p.slug !== undefined) payload.slug = p.slug
  if (p.sku !== undefined) payload.sku = p.sku
  if (p.status !== undefined) payload.status = p.status
  if (p.shortDescription !== undefined) payload.short_description = p.shortDescription
  if (p.description !== undefined) payload.description = p.description
  if (p.origin !== undefined) payload.origin = p.origin
  if (p.fob !== undefined) payload.fob = parseMoney(p.fob)
  if (p.price !== undefined) {
    const n = parseMoney(p.price)
    if (n) payload.price = n
  }
  if (p.minOrder !== undefined) payload.min_order = p.minOrder
  if (p.moq !== undefined) payload.moq = p.moq
  if (p.leadTime !== undefined) payload.lead_time = p.leadTime
  if (p.hsCode !== undefined) payload.hs_code = p.hsCode
  if (p.shelfLife !== undefined) payload.shelf_life = p.shelfLife
  if (p.storageInstructions !== undefined) payload.storage_instructions = p.storageInstructions
  if (p.incoterms !== undefined) payload.incoterms = p.incoterms
  if (p.videoUrl !== undefined) payload.video_url = p.videoUrl
  // Prefer raw path for DB; fall back to imageUrl only if path not provided
  if (p.imagePath !== undefined) {
    payload.image_url = p.imagePath || null
  } else if (p.imageUrl !== undefined) {
    payload.image_url = p.imageUrl || null
  }
  if (p.labReportPath !== undefined) {
    payload.lab_report_path = p.labReportPath ? (toStoredMediaPath(p.labReportPath) || p.labReportPath) : null
  }
  if (p.featured !== undefined) payload.featured = p.featured
  if (p.categoryId !== undefined) {
    payload.category_id = p.categoryId != null && Number.isFinite(Number(p.categoryId))
      ? Number(p.categoryId)
      : null
  } else if (p.category !== undefined && p.category) {
    const match = categoriesCache.find(
      (c) => c.name.toLowerCase() === String(p.category).toLowerCase()
        || c.slug.toLowerCase() === String(p.category).toLowerCase(),
    )
    if (match) payload.category_id = match.id
  }
  if (p.stock !== undefined) {
    const raw = String(p.stock).trim()
    const stockLabels: Record<string, number> = {
      Available: 100,
      Limited: 25,
      Seasonal: 50,
      "Out of Stock": 0,
    }
    if (raw in stockLabels) {
      payload.stock = stockLabels[raw]
    } else {
      const n = parseInt(raw.replace(/\D/g, ""), 10)
      if (Number.isFinite(n)) payload.stock = n
    }
  }
  if (p.certifications !== undefined) payload.certifications = p.certifications
  if (p.paymentTerms !== undefined) payload.payment_terms = p.paymentTerms
  if (p.deliveryTerms !== undefined) payload.delivery_terms = p.deliveryTerms
  if (p.packagingOptions !== undefined) payload.packaging_options = p.packagingOptions
  if (p.exportMarkets !== undefined) payload.export_markets = p.exportMarkets
  if (p.specs !== undefined) payload.specs = p.specs
  if (p.galleryPaths !== undefined) {
    const primary = (p.imagePath ?? "").trim()
    payload.media = (p.galleryPaths || [])
      .filter((url) => !!url && url !== primary)
      .map((url, i) => ({ url, type: "image", sort_order: i }))
  }
  return payload
}

function projectToApi(p: Partial<AdminInvestProject>) {
  const payload: Record<string, unknown> = {}
  if (p.title !== undefined) payload.title = p.title
  if (p.type !== undefined) payload.type = p.type
  if (p.tradeDirection !== undefined) payload.trade_direction = p.tradeDirection
  if (p.status !== undefined) payload.status = p.status
  if (p.target !== undefined) payload.target_amount = p.target
  if (p.raised !== undefined) payload.raised_amount = p.raised
  if (p.investors !== undefined) payload.investors_count = p.investors
  if (p.roi !== undefined) payload.roi_label = p.roi
  if (p.expectedReturnPct !== undefined) payload.expected_return_pct = p.expectedReturnPct
  if (p.minInvestment !== undefined) payload.min_investment = p.minInvestment
  if (p.maxInvestment !== undefined) payload.max_investment = p.maxInvestment
  if (p.location !== undefined) payload.location = p.location
  if (p.origin !== undefined) payload.origin = p.origin
  if (p.destination !== undefined) payload.destination = p.destination
  if (p.destinationCountry !== undefined) payload.destination_country = p.destinationCountry
  if (p.destinationFlag !== undefined) payload.destination_flag = p.destinationFlag
  if (p.portOfLoading !== undefined) payload.port_of_loading = p.portOfLoading
  if (p.portOfDischarge !== undefined) payload.port_of_discharge = p.portOfDischarge
  if (p.vessel !== undefined) payload.vessel = p.vessel
  if (p.shippingLine !== undefined) payload.shipping_line = p.shippingLine
  if (p.commodity !== undefined) payload.commodity = p.commodity
  if (p.variety !== undefined) payload.variety = p.variety
  if (p.containerType !== undefined) payload.container_type = p.containerType
  if (p.incoterm !== undefined) payload.incoterm = p.incoterm
  if (p.paymentTermsInvest !== undefined) payload.payment_terms = p.paymentTermsInvest
  if (p.currentProjectStage !== undefined) payload.current_project_stage = p.currentProjectStage
  if (p.etd) payload.etd = p.etd
  if (p.eta) payload.eta = p.eta
  if (p.fundingDeadlineDate) payload.funding_deadline = p.fundingDeadlineDate
  if (p.imagePath !== undefined) {
    payload.image_url = p.imagePath ? (toStoredMediaPath(p.imagePath) || p.imagePath) : null
  } else if (p.imageUrl !== undefined) {
    payload.image_url = p.imageUrl ? (toStoredMediaPath(p.imageUrl) || p.imageUrl) : null
  }
  if (p.description !== undefined) payload.description = p.description
  if (p.riskLevel !== undefined) payload.risk_level = p.riskLevel
  if (p.investmentPeriodDays !== undefined) payload.investment_period_days = p.investmentPeriodDays
  if (p.containerValue !== undefined) payload.container_value = p.containerValue
  const metaPayload: Record<string, unknown> =
    p.meta !== undefined && typeof p.meta === "object" ? { ...p.meta } : {}
  if (
    p.completion !== undefined
    || p.productCategory !== undefined
    || p.timeline !== undefined
    || p.sortOrder !== undefined
    || p.containerNumber !== undefined
  ) {
    if (p.completion !== undefined) metaPayload.completion = p.completion
    if (p.productCategory !== undefined) metaPayload.product_category = p.productCategory
    if (p.timeline !== undefined) metaPayload.timeline = p.timeline
    if (p.sortOrder !== undefined) metaPayload.sort_order = p.sortOrder
    if (p.containerNumber !== undefined) metaPayload.container_no = p.containerNumber
  }
  if (p.targetDistributionDate !== undefined) {
    metaPayload.target_distribution_date = p.targetDistributionDate || null
  }
  if (Object.keys(metaPayload).length > 0 || p.meta !== undefined) payload.meta = metaPayload
  if (p.containerNumber !== undefined) {
    const existing = typeof payload.meta === "object" && payload.meta ? (payload.meta as Record<string, unknown>) : {}
    payload.meta = { ...existing, container_no: p.containerNumber }
  }
  return payload
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchProducts() {
  // Prefer admin list; fall back to public catalog for homepage
  const admin = await silent(() => api.get("/api/admin/products", { per_page: 100 }))
  if (admin) {
    productsCache = unwrapPage(admin).data.map(mapAdminProduct)
    notifyProductsChanged()
    return
  }
  const pub = await silent(() => api.get("/api/products", { per_page: 100 }))
  if (pub) {
    productsCache = unwrapPage(pub).data.map(mapAdminProduct)
    notifyProductsChanged()
  }
}

async function fetchCategories() {
  const res = await silent(() => api.get("/api/categories"))
  if (!res) return
  const rows = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? res : []
  categoriesCache = rows.map((c: any) => ({
    id: Number(c.id),
    name: String(c.name || ""),
    slug: String(c.slug || ""),
  })).filter((c: AdminCategory) => Number.isFinite(c.id) && c.name)
}

async function fetchUsers() {
  const res = await silent(() => api.get("/api/admin/users", { per_page: 100 }))
  if (res) usersCache = unwrapPage(res).data.map(mapUser)
}

export async function fetchUsersPaginated(params: {
  role?: string
  page?: number
  per_page?: number
  search?: string
  status?: string
}): Promise<{ data: AdminUser[]; last_page: number; total: number; current_page: number }> {
  const res = await api.get("/api/admin/users", {
    role: params.role,
    page: params.page ?? 1,
    per_page: params.per_page ?? 20,
    search: params.search || undefined,
    status: params.status || undefined,
  })
  const page = unwrapPage(res)
  return {
    data: page.data.map(mapUser),
    last_page: page.meta.last_page,
    total: page.meta.total,
    current_page: page.meta.current_page,
  }
}

async function fetchOrders() {
  const res = await silent(() => api.get("/api/admin/orders", { per_page: 100 }))
  if (res) ordersCache = unwrapPage(res).data.map(mapOrder)
}

async function fetchRfqs() {
  const res = await silent(() => api.get("/api/admin/rfqs", { per_page: 100 }))
  if (res) rfqsCache = unwrapPage(res).data.map(mapRfq)
}

async function fetchQuotations() {
  const res = await silent(() => api.get("/api/admin/quotations", { per_page: 100 }))
  if (res) {
    const list = unwrapPage(res).data
    quotationsCache = list.map(mapQuotation)
    buyerQuotesCache = list.map(mapBuyerQuote)
  }
}

async function fetchFobPrices() {
  const res = await silent(() => api.get("/api/admin/fob-prices", { per_page: 100 }))
  if (res) fobPricesCache = unwrapPage(res).data.map(mapFob)
}

async function fetchFinancePageResponse(path: string, requestedPage: number): Promise<unknown> {
  const page = Math.max(1, Math.trunc(requestedPage))
  const requestPage = (pageNumber: number) => api.get(path, { page: pageNumber, per_page: 100 })
  let response = await requestPage(page)
  const lastPage = Math.max(1, unwrapPage(response).meta.last_page)

  if (page > lastPage) {
    response = await requestPage(lastPage)
  }

  return response
}

function financePageMeta(
  response: unknown,
  requestedPage: number,
  cachedCount: number,
): AdminFinancePageMeta {
  if (response) return unwrapPage(response).meta
  return {
    current_page: requestedPage,
    last_page: 1,
    per_page: 100,
    total: cachedCount,
  }
}

export async function fetchFinance(options: AdminFinancePageRequest = {}): Promise<AdminFinancePages> {
  await fetchAdminExchangeRates()
  const depositsPage = options.depositsPage ?? 1
  const withdrawalsPage = options.withdrawalsPage ?? 1
  const transactionsPage = options.transactionsPage ?? 1
  const fetchList = (path: string, page: number) => options.strict
    ? fetchFinancePageResponse(path, page)
    : silent(() => api.get(path, { page, per_page: 100 }))
  const [buyerDeps, deps, wds, txns, platformWallet, financeStats] = await Promise.all([
    silent(() => api.get("/api/admin/finance/buyer-deposits", { page: 1, per_page: 100 })),
    fetchList("/api/admin/finance/deposits", depositsPage),
    fetchList("/api/admin/finance/withdrawals", withdrawalsPage),
    fetchList("/api/admin/finance/transactions", transactionsPage),
    silent(() => api.get("/api/admin/finance/platform-wallet")),
    silent(() => api.get("/api/admin/finance/stats")),
  ])
  if (buyerDeps) buyerDepositsCache = unwrapPage(buyerDeps).data.map(mapBuyerDeposit)
  if (deps) depositsCache = unwrapPage(deps).data.map(mapDeposit)
  if (wds) withdrawalsCache = unwrapPage(wds).data.map(mapWithdrawal)
  if (txns) transactionsCache = unwrapPage(txns).data.map(mapTransaction)
  if (platformWallet) {
    const d = (platformWallet as { data?: Record<string, unknown> })?.data ?? platformWallet as Record<string, unknown>
    platformWalletCache = {
      balance: Number(d.balance ?? 0),
      currency: String(d.currency ?? 'USD'),
      activeInvestmentsTotal: Number(d.active_investments_total ?? 0),
      pendingReturnsTotal: Number(d.pending_returns_total ?? 0),
    }
  }
  if (financeStats) {
    applyFinanceStats(financeStats)
  }

  return {
    deposits: financePageMeta(deps, depositsPage, depositsCache.length),
    withdrawals: financePageMeta(wds, withdrawalsPage, withdrawalsCache.length),
    transactions: financePageMeta(txns, transactionsPage, transactionsCache.length),
  }
}

export async function fetchAdminBuyerDepositsBySearchTerm(search: string): Promise<AdminBuyerDeposit[]> {
  const res = await api.get("/api/admin/finance/buyer-deposits", { search, per_page: 100 })
  return unwrapPage(res).data.map(mapBuyerDeposit)
}

export async function fetchAdminDepositsBySearchTerm(search: string): Promise<AdminDeposit[]> {
  const res = await api.get("/api/admin/finance/deposits", { search, per_page: 100 })
  return unwrapPage(res).data.map(mapDeposit)
}

export async function fetchAdminWithdrawalsBySearchTerm(search: string): Promise<AdminWithdrawal[]> {
  const res = await api.get("/api/admin/finance/withdrawals", { search, per_page: 100 })
  return unwrapPage(res).data.map(mapWithdrawal)
}

export async function fetchAdminTransactionsBySearchTerm(search: string): Promise<AdminTransaction[]> {
  const res = await api.get("/api/admin/finance/transactions", { search, per_page: 100 })
  return unwrapPage(res).data.map(mapTransaction)
}

function applyFinanceStats(res: unknown) {
  const d = ((res as { data?: Record<string, unknown> })?.data ?? res) as Record<string, unknown>
  const cashflowRaw = Array.isArray(d.cashflow) ? d.cashflow : []
  financeStatsCache = {
    monthlyRevenue: Number(d.monthly_revenue ?? 0),
    monthlyRevenueMomPct: Number(d.monthly_revenue_mom_pct ?? 0),
    monthlyWithdrawals: Number(d.monthly_withdrawals ?? 0),
    monthLabel: String(d.month_label ?? emptyFinanceStats().monthLabel),
    platformBalance: Number(d.platform_balance ?? 0),
    totalInvestors: Number(d.total_investors ?? 0),
    avgPortfolio: Number(d.avg_portfolio ?? 0),
    cumulativeReturns: Number(d.cumulative_returns ?? 0),
    cashflow: cashflowRaw.map((p: any) => ({
      month: String(p?.month ?? ""),
      deposits: Number(p?.deposits ?? 0),
      withdrawals: Number(p?.withdrawals ?? 0),
      profit: Number(p?.profit ?? 0),
    })),
  }
}

export async function fetchFinanceStats(): Promise<FinanceOverviewStats> {
  const res = await silent(() => api.get("/api/admin/finance/stats"))
  if (res) applyFinanceStats(res)
  return financeStatsCache
}

function applyAdminReports(res: unknown) {
  const d = ((res as { data?: Record<string, unknown> })?.data ?? res) as Record<string, unknown>
  const kpis = (d.kpis ?? {}) as Record<string, unknown>
  const biz = (d.business_stats ?? {}) as Record<string, unknown>
  const logistics = (d.logistics ?? {}) as Record<string, unknown>
  const byType = Array.isArray(d.investments_by_type) ? d.investments_by_type : []
  const trend = Array.isArray(d.revenue_trend) ? d.revenue_trend : []
  const quarterly = Array.isArray(d.quarterly_revenue) ? d.quarterly_revenue : []

  adminReportsCache = {
    kpis: {
      totalRevenue: Number(kpis.total_revenue ?? 0),
      ytdRevenue: Number(kpis.ytd_revenue ?? 0),
      revenueYoyPct: Number(kpis.revenue_yoy_pct ?? 0),
      ordersTotal: Number(kpis.orders_total ?? 0),
      ordersYoyPct: Number(kpis.orders_yoy_pct ?? 0),
      activeBuyers: Number(kpis.active_buyers ?? 0),
      buyersTotal: Number(kpis.buyers_total ?? 0),
      buyersYoyPct: Number(kpis.buyers_yoy_pct ?? 0),
      shipmentsTotal: Number(kpis.shipments_total ?? 0),
      shipmentsYoyPct: Number(kpis.shipments_yoy_pct ?? 0),
    },
    businessStats: {
      totalRevenueYtd: Number(biz.total_revenue_ytd ?? 0),
      totalProfitYtd: Number(biz.total_profit_ytd ?? 0),
      profitMarginPct: Number(biz.profit_margin_pct ?? 0),
      totalOrders: Number(biz.total_orders ?? 0),
      activeBuyers: Number(biz.active_buyers ?? 0),
      countriesReached: Number(biz.countries_reached ?? 0),
      productsCatalogued: Number(biz.products_catalogued ?? 0),
      productsApproved: Number(biz.products_approved ?? 0),
      onTimeDeliveryPct: Number(biz.on_time_delivery_pct ?? 0),
      avgLeadTimeDays: Number(biz.avg_lead_time_days ?? 0),
      customerSatisfaction: Number(biz.customer_satisfaction ?? 0),
      complianceRatePct: Number(biz.compliance_rate_pct ?? 0),
      revenueYoyPct: Number(biz.revenue_yoy_pct ?? 0),
      ordersYoyPct: Number(biz.orders_yoy_pct ?? 0),
      buyersYoyPct: Number(biz.buyers_yoy_pct ?? 0),
    },
    logistics: {
      totalShipments: Number(logistics.total_shipments ?? 0),
      inTransit: Number(logistics.in_transit ?? 0),
      delivered: Number(logistics.delivered ?? 0),
      onTimeRatePct: Number(logistics.on_time_rate_pct ?? 0),
    },
    investmentsByType: byType.map((p: any) => ({
      type: String(p?.type ?? ""),
      typeKey: String(p?.type_key ?? ""),
      raised: Number(p?.raised ?? 0),
      investors: Number(p?.investors ?? 0),
      avgRoiPct: Number(p?.avg_roi_pct ?? 0),
    })),
    revenueTrend: trend.map((p: any) => ({
      month: String(p?.month ?? ""),
      revenue: Number(p?.revenue ?? 0),
      profit: Number(p?.profit ?? 0),
      expenses: Number(p?.expenses ?? 0),
    })),
    quarterlyRevenue: quarterly.map((p: any) => ({
      quarter: String(p?.quarter ?? ""),
      revenue: Number(p?.revenue ?? 0),
    })),
  }
}

export async function fetchAdminReports(): Promise<AdminReportsData> {
  const res = await silent(() => api.get("/api/admin/reports"))
  if (res) applyAdminReports(res)
  return adminReportsCache
}

async function fetchShipments() {
  const res = await silent(() => api.get("/api/admin/shipments", { per_page: 100 }))
  if (res) shipmentsCache = unwrapPage(res).data.map(mapShipment)
}

export interface InvestmentGrowthPoint {
  month: string
  amount: number
}

export interface InvestmentStats {
  growthTrend: InvestmentGrowthPoint[]
  totals: {
    totalRaised: number
    activeProjects: number
    pendingDeposits: number
    pendingWithdrawals: number
    totalInvestors: number
    containerCount: number
    produceCount: number
    plantCount: number
  }
}

let investmentStatsCache: InvestmentStats = {
  growthTrend: [],
  totals: {
    totalRaised: 0,
    activeProjects: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalInvestors: 0,
    containerCount: 0,
    produceCount: 0,
    plantCount: 0,
  },
}

export type InvestProjectsContext = "public" | "investor" | "admin"

async function fetchInvestments(context: InvestProjectsContext = "public") {
  if (context === "investor") {
    const investor = await silent(() => api.get("/api/investor/projects", { per_page: 100 }))
    if (investor) {
      investProjectsCache = unwrapPage(investor).data.map(mapInvestProject)
    }
    return
  }

  if (context === "admin") {
    const admin = await silent(() => api.get("/api/admin/investment-projects", { per_page: 100 }))
    if (admin) investProjectsCache = unwrapPage(admin).data.map(mapInvestProject)
    return
  }

  const pub = await silent(() => api.publicGet("/api/investments", { per_page: 100 }))
  if (pub) {
    investProjectsCache = unwrapPage(pub).data.map(mapInvestProject)
  }
}

export async function fetchInvestorProjects(): Promise<AdminInvestProject[]> {
  await fetchInvestments("investor")
  return investProjectsCache
}

async function fetchInvestmentStats() {
  const res = await silent(() => api.get("/api/admin/investment-projects/stats"))
  if (!res) return
  const data = (res as any)?.data ?? res
  const trend = Array.isArray(data?.growth_trend) ? data.growth_trend : []
  const t = data?.totals ?? {}
  investmentStatsCache = {
    growthTrend: trend.map((p: any) => ({
      month: String(p.month ?? ""),
      amount: Number(p.amount ?? 0),
    })),
    totals: {
      totalRaised: Number(t.total_raised ?? 0),
      activeProjects: Number(t.active_projects ?? 0),
      pendingDeposits: Number(t.pending_deposits ?? 0),
      pendingWithdrawals: Number(t.pending_withdrawals ?? 0),
      totalInvestors: Number(t.total_investors ?? 0),
      containerCount: Number(t.container_count ?? 0),
      produceCount: Number(t.produce_count ?? 0),
      plantCount: Number(t.plant_count ?? 0),
    },
  }
}

export const getInvestmentStats = (): InvestmentStats => investmentStatsCache

export async function refreshInvestments(): Promise<AdminInvestProject[]> {
  await fetchInvestments("admin")
  return investProjectsCache
}

export async function refreshInvestmentStats(): Promise<InvestmentStats> {
  await fetchInvestmentStats()
  return investmentStatsCache
}

async function fetchCompliance() {
  const [kyc, aml, logs] = await Promise.all([
    silent(() => api.get("/api/admin/compliance/kyc", { per_page: 100 })),
    silent(() => api.get("/api/admin/compliance/aml", { per_page: 100 })),
    silent(() => api.get("/api/admin/compliance/audit-logs", { per_page: 100 })),
  ])
  if (kyc) kycCache = unwrapPage(kyc).data.map(mapKyc)
  if (aml) amlCache = unwrapPage(aml).data.map(mapAml)
  if (logs) auditLogsCache = unwrapPage(logs).data.map(mapAudit)
}

async function fetchCrm() {
  const res = await silent(() => api.get("/api/admin/crm/leads", { per_page: 100 }))
  if (!res) return
  const leads = unwrapPage(res).data
  crmLeadsCache = leads.map(mapLead)
  const acts: AdminCRMActivity[] = []
  for (const l of leads) {
    const name = l.name || "—"
    if (Array.isArray(l.activities)) {
      for (const a of l.activities) acts.push(mapActivity(a, name))
    }
  }
  crmActivitiesCache = acts
}

async function fetchTickets() {
  const res = await silent(() => api.get("/api/admin/support/tickets", { per_page: 100 }))
  if (res) ticketsCache = unwrapPage(res).data.map(mapTicket)
}

async function fetchSupplierOffers() {
  const res = await silent(() => api.get("/api/admin/supplier-offers", { per_page: 100 }))
  if (res) {
    supplierOffersCache = unwrapPage(res).data.map(mapOffer)
    return
  }
  const mine = await silent(() => api.get("/api/supplier/offers", { per_page: 100 }))
  if (mine) supplierOffersCache = unwrapPage(mine).data.map(mapOffer)
}

async function fetchSettings() {
  const res = await silent(() => api.get("/api/settings"))
  if (!res) return
  const data = (res as any)?.data ?? res
  settingsCache = mapPlatformSettings(data)
}

export async function initAdminData(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    try { await ensureCsrf() } catch { /* ignore */ }
    await fetchAdminExchangeRates()
    await Promise.allSettled([
      fetchProducts(),
      fetchCategories(),
      fetchUsers(),
      fetchOrders(),
      fetchRfqs(),
      fetchQuotations(),
      fetchFobPrices(),
      fetchFinance(),
      fetchAdminReports(),
      fetchShipments(),
      fetchInvestments("admin"),
      fetchInvestmentStats(),
      fetchCompliance(),
      fetchCrm(),
      fetchTickets(),
      fetchSupplierOffers(),
      fetchSettings(),
      refreshBankAccounts(),
      refreshIncoterms(),
    ])
  })().finally(() => { initPromise = null })
  return initPromise
}

export function initProductsFromStatic() {
  void fetchProducts()
}

export function initInvestFromStatic() {
  void fetchInvestments("public")
}

/** Load investment projects and resolve when cache is ready. */
export async function loadInvestProjects(options?: { context?: InvestProjectsContext }): Promise<AdminInvestProject[]> {
  await fetchInvestments(options?.context ?? "public")
  return investProjectsCache
}

// ─── Getters ──────────────────────────────────────────────────────────────────

export const getUsers = (): AdminUser[] => usersCache
export const getOrders = (): AdminOrder[] => ordersCache
export const getRFQs = (): AdminRFQ[] => rfqsCache
export const getQuotations = (): AdminQuotation[] => quotationsCache
export const getDeposits = (): AdminDeposit[] => depositsCache
export const getBuyerDeposits = (): AdminBuyerDeposit[] => buyerDepositsCache
export const getWithdrawals = (): AdminWithdrawal[] => withdrawalsCache
export const getTransactions = (): AdminTransaction[] => transactionsCache
export const getPlatformWalletStats = (): PlatformWalletStats => platformWalletCache
export const getFinanceStats = (): FinanceOverviewStats => financeStatsCache
export const getAdminReports = (): AdminReportsData => adminReportsCache
export const getProducts = (): AdminProduct[] => productsCache
export const getCategories = (): AdminCategory[] => categoriesCache
export async function refreshProducts(): Promise<AdminProduct[]> {
  await fetchProducts()
  return productsCache
}
export async function refreshCategories(): Promise<AdminCategory[]> {
  await fetchCategories()
  return categoriesCache
}
export const getShipments = (): AdminShipment[] => shipmentsCache
export const getKYC = (): AdminKYC[] => kycCache
export const getAML = (): AdminAMLAlert[] => amlCache
export const getTickets = (): AdminTicket[] => ticketsCache
export const getCRMLeads = (): AdminCRMLead[] => crmLeadsCache
export const getCRMActivities = (): AdminCRMActivity[] => crmActivitiesCache
export const getInvestProjects = (): AdminInvestProject[] => investProjectsCache
export const getAuditLogs = (): AdminAuditLog[] => auditLogsCache
export const getSettings = (): AdminSettings => settingsCache
export const getSupplierOffers = (): SupplierOffer[] => supplierOffersCache
export const getFobPrices = (): FobPrice[] => fobPricesCache
export const getBuyerQuotes = (): BuyerQuote[] => buyerQuotesCache
export const getQuotesForBuyer = (buyer: string): BuyerQuote[] =>
  buyerQuotesCache.filter(q => q.buyer === buyer)

export function quoteTotal(q: BuyerQuote): number {
  return q.qtyMT * q.fobUnitPrice + q.freight + q.insurance + q.docFee
}

// ─── Audit (local cache — server writes its own audit trail) ──────────────────

export function addAuditLog(action: string, module: string) {
  const newLog: AdminAuditLog = {
    id: `LOG-${Date.now()}`,
    actor: "admin",
    action,
    module,
    ip: "—",
    timestamp: new Date().toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }),
  }
  auditLogsCache = [newLog, ...auditLogsCache].slice(0, 200)
}

export function recordBuyerOrder(o: AdminOrder) {
  ordersCache = [o, ...ordersCache]
  addAuditLog(`New buyer order ${o.id} — ${o.product} (${o.buyer})`, "System")
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function updateUserKYCAsync(id: string, status: AdminUser["kycStatus"]): Promise<void> {
  const idx = usersCache.findIndex(u => u.id === id)
  const user = idx !== -1 ? usersCache[idx] : null

  if (status === "verified" && user?.kycApplicationId) {
    await api.post(`/api/admin/compliance/kyc/${user.kycApplicationId}/approve`)
    await Promise.all([fetchCompliance(), fetchUsers()])
    addAuditLog(`Approved KYC for user ${user.fullName}`, "Users")
    return
  }
  if (status === "rejected" && user?.kycApplicationId) {
    await api.post(`/api/admin/compliance/kyc/${user.kycApplicationId}/reject`)
    await Promise.all([fetchCompliance(), fetchUsers()])
    addAuditLog(`Rejected KYC for user ${user.fullName}`, "Users")
    return
  }
  if (status === "suspended") {
    await api.put(`/api/admin/users/${id}`, { account_status: "suspended" })
  } else if (status === "verified") {
    await api.put(`/api/admin/users/${id}`, { account_status: "active" })
  }
  await fetchUsers()
  addAuditLog(`Updated user ${id} KYC → ${status}`, "Users")
}

export function updateUserKYC(id: string, status: AdminUser["kycStatus"]) {
  const idx = usersCache.findIndex(u => u.id === id)
  if (idx === -1) return
  const user = usersCache[idx]
  usersCache[idx] = {
    ...user,
    kycStatus: status,
    status: status === "suspended" ? "suspended" : status === "verified" ? "active" : usersCache[idx].status,
  }
  usersCache = [...usersCache]

  if (status === "verified" && user.kycApplicationId) {
    approveKYC(user.kycApplicationId)
    return
  }
  if (status === "rejected" && user.kycApplicationId) {
    rejectKYC(user.kycApplicationId)
    return
  }

  if (status === "suspended") {
    void api.put(`/api/admin/users/${id}`, { account_status: "suspended" }).catch(onFail(fetchUsers))
  } else if (status === "verified") {
    void api.put(`/api/admin/users/${id}`, { account_status: "active" }).catch(onFail(fetchUsers))
  }
  addAuditLog(`Updated user ${usersCache[idx].fullName} KYC → ${status}`, "Users")
}

export async function fetchUserKyc(userId: string): Promise<AdminKYC | null> {
  try {
    const res = await api.get<{ data: any | null }>(`/api/admin/users/${userId}/kyc`)
    if (!res?.data) return null
    return mapKyc(res.data)
  } catch {
    const cached = kycCache.find(k => k.userId === userId)
    return cached || null
  }
}

export function getKycByUserId(userId: string): AdminKYC | undefined {
  return kycCache.find(k => k.userId === userId)
}

export async function impersonateUser(userId: string): Promise<{ redirect: string }> {
  const res = await api.post<{ redirect?: string; user?: any }>(`/api/admin/users/${userId}/impersonate`)
  return { redirect: res?.redirect || "/" }
}

export async function suspendUserAsync(id: string, currentStatus?: string): Promise<void> {
  const idx = usersCache.findIndex(u => u.id === id)
  const current = currentStatus ?? usersCache[idx]?.status
  if (!current) return
  const next = current === "suspended" ? "active" : "suspended"
  await api.put(`/api/admin/users/${id}`, { account_status: next })
  await fetchUsers()
  const name = usersCache.find(u => u.id === id)?.fullName ?? id
  addAuditLog(`${next === "suspended" ? "Disabled" : "Enabled"} user ${name}`, "Users")
}

export async function deleteUserAsync(id: string): Promise<void> {
  await api.delete(`/api/admin/users/${id}`)
  await fetchUsers()
  addAuditLog(`User permanently deleted ${id}`, "Users")
}

export async function createAdminUserAsync(input: {
  name: string
  email: string
  password: string
  phone?: string
  role: "buyer" | "investor" | "supplier"
  country?: string
}): Promise<void> {
  await api.post("/api/admin/users", {
    name: input.name,
    email: input.email,
    password: input.password,
    phone: input.phone || undefined,
    role: input.role,
    country: input.country || undefined,
  })
  await fetchUsers()
  addAuditLog(`Created ${input.role} ${input.email}`, "Users")
}

export function suspendUser(id: string) {
  const idx = usersCache.findIndex(u => u.id === id)
  if (idx === -1) return
  const next = usersCache[idx].status === "suspended" ? "active" : "suspended"
  usersCache[idx] = { ...usersCache[idx], status: next, kycStatus: next === "suspended" ? "suspended" : usersCache[idx].kycStatus }
  usersCache = [...usersCache]
  void api.put(`/api/admin/users/${id}`, { account_status: next }).catch(onFail(fetchUsers))
  addAuditLog(`${next === "suspended" ? "Suspended" : "Reinstated"} user ${usersCache[idx].fullName}`, "Users")
}

export function deleteUser(id: string) {
  usersCache = usersCache.filter(u => u.id !== id)
  void api.delete(`/api/admin/users/${id}`).catch(onFail(fetchUsers))
  addAuditLog(`User permanently deleted ${id}`, "Users")
}

export function updateUserAvatar(id: string, avatarUrl: string) {
  const idx = usersCache.findIndex(u => u.id === id)
  if (idx === -1) return
  usersCache[idx] = { ...usersCache[idx], avatarUrl }
  usersCache = [...usersCache]
}

// ─── Orders / RFQs ────────────────────────────────────────────────────────────

export async function updateOrderStatus(id: string, status: AdminOrder["status"]): Promise<AdminOrder> {
  const idx = ordersCache.findIndex(o => o.id === id)
  if (idx === -1) throw new Error("Order not found")
  const previous = ordersCache[idx]
  const apiId = resolveOrderApiId(id)
  try {
    const res = await api.patch<{ data?: any }>(`/api/admin/orders/${apiId}/status`, { status })
    if (res?.data) {
      const mapped = mapOrder(res.data)
      const i = ordersCache.findIndex(o => o.id === id || o.id === mapped.id)
      if (i !== -1) {
        ordersCache[i] = mapped
        ordersCache = [...ordersCache]
      }
      addAuditLog(`Updated order ${id} status → ${orderStatusLabel(status)}`, "Orders")
      return mapped
    }
    // Fallback: apply status locally if API returned no data payload
    ordersCache[idx] = { ...previous, status }
    ordersCache = [...ordersCache]
    addAuditLog(`Updated order ${id} status → ${orderStatusLabel(status)}`, "Orders")
    return ordersCache[idx]
  } catch (e) {
    void fetchOrders()
    throw e
  }
}

/** Resolve display order id (e.g. PO-2026-024) to numeric DB id for API calls. */
export function resolveOrderApiId(id: string): string {
  return orderDbIdByKey.get(id) || id
}

export type AdminOrderDocument = AdminShipmentDocument

export async function fetchOrderDocuments(orderId: string): Promise<AdminOrderDocument[]> {
  const apiId = resolveOrderApiId(orderId)
  const res = await api.get<{ data: AdminOrderDocument[] }>(`/api/admin/orders/${apiId}/documents`)
  return res.data || []
}

export async function uploadOrderDocument(
  orderId: string,
  file: File,
  type: string,
  title?: string,
): Promise<AdminOrderDocument> {
  const apiId = resolveOrderApiId(orderId)
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder", "trade-documents")
  const uploaded = await api.upload<{ data: { path: string; url: string; name: string } }>(
    "/api/uploads",
    fd,
  )
  const res = await api.post<{ data: AdminOrderDocument }>(
    `/api/admin/orders/${apiId}/documents`,
    {
      type,
      title: title || type,
      path: uploaded.data.path,
    },
  )
  addAuditLog(`Uploaded ${type} for order ${orderId}`, "Orders")
  return res.data
}

export async function deleteOrderDocument(orderId: string, documentId: number): Promise<void> {
  const apiId = resolveOrderApiId(orderId)
  await api.delete(`/api/admin/orders/${apiId}/documents/${documentId}`)
  addAuditLog(`Deleted document ${documentId} from order ${orderId}`, "Orders")
}

export function updateRFQStatus(id: string, status: AdminRFQ["status"]) {
  const idx = rfqsCache.findIndex(r => r.id === id)
  if (idx === -1) return
  rfqsCache[idx] = { ...rfqsCache[idx], status }
  rfqsCache = [...rfqsCache]
  // No admin RFQ status endpoint — cache only
  addAuditLog(`Updated RFQ ${id} status → ${status}`, "Orders")
}

/** Parse qty strings like "25 MT" or "25.5" into a numeric MT value. */
export function parseQtyMt(qty: string | number | null | undefined): number {
  if (typeof qty === "number") return Number.isFinite(qty) ? qty : 0
  const m = String(qty ?? "").match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

/** Look up suggested FOB $/MT for a product name from the daily FOB sheet. */
export function suggestedFobPrice(productName: string): number {
  const needle = productName.trim().toLowerCase()
  const hit = fobPricesCache.find(p => p.product.trim().toLowerCase() === needle)
    ?? fobPricesCache.find(p => needle.includes(p.product.trim().toLowerCase()) || p.product.trim().toLowerCase().includes(needle))
  return hit?.price ?? 0
}

/**
 * Create and send a quotation from an RFQ with a single unit quote price.
 * Total for the buyer = fobUnitPrice × qtyMt (fees left at 0).
 */
export async function adminQuoteFromRfq(
  rfqId: string,
  data: { fobUnitPrice: number; qtyMt: number; notes?: string },
): Promise<void> {
  if (!/^\d+$/.test(rfqId)) throw new Error("Invalid RFQ id")
  if (!(data.fobUnitPrice >= 0) || !Number.isFinite(data.fobUnitPrice)) {
    throw new Error("Enter a valid quote price")
  }
  const qtyMt = data.qtyMt > 0 ? data.qtyMt : 1
  const valid = new Date(Date.now() + 7 * 86400000)

  await api.post(`/api/admin/rfqs/${rfqId}/quotations`, {
    qty_mt: qtyMt,
    fob_unit_price: data.fobUnitPrice,
    freight: 0,
    insurance: 0,
    doc_fee: 0,
    notes: data.notes || undefined,
    send: true,
    valid_until: valid.toISOString().slice(0, 10),
  })

  const idx = rfqsCache.findIndex(r => r.id === rfqId)
  if (idx !== -1) {
    rfqsCache[idx] = { ...rfqsCache[idx], status: "quoted" }
    rfqsCache = [...rfqsCache]
  }

  await Promise.allSettled([fetchRfqs(), fetchQuotations()])
  addAuditLog(`Quoted RFQ ${rfqId} at $${data.fobUnitPrice}/MT`, "Orders")
}

export async function refreshAdminOrdersData(): Promise<void> {
  await Promise.allSettled([fetchOrders(), fetchRfqs(), fetchQuotations(), fetchFobPrices()])
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export async function approveDeposit(id: string): Promise<void> {
  await api.post(`/api/admin/finance/deposits/${id}/approve`)
  await fetchFinance()
  addAuditLog(`Approved deposit ${id}`, "Finance")
}

export async function rejectDeposit(id: string): Promise<void> {
  await api.post(`/api/admin/finance/deposits/${id}/reject`)
  await fetchFinance()
  addAuditLog(`Rejected deposit ${id}`, "Finance")
}

export function cancelDeposit(id: string) {
  const idx = depositsCache.findIndex(d => d.id === id)
  if (idx === -1) return
  depositsCache[idx] = { ...depositsCache[idx], status: "cancelled" }
  depositsCache = [...depositsCache]
  void api.post(`/api/admin/finance/deposits/${id}/cancel`)
    .then(() => fetchFinance())
    .catch(onFail(async () => { await fetchFinance() }))
  addAuditLog(`Cancelled deposit ${id}`, "Finance")
}

export async function approveBuyerDeposit(id: string): Promise<void> {
  await api.post(`/api/admin/finance/buyer-deposits/${id}/approve`)
  await fetchFinance()
  addAuditLog(`Approved buyer deposit ${id}`, "Finance")
}

export async function rejectBuyerDeposit(id: string): Promise<void> {
  await api.post(`/api/admin/finance/buyer-deposits/${id}/reject`)
  await fetchFinance()
  addAuditLog(`Rejected buyer deposit ${id}`, "Finance")
}

export async function cancelBuyerDeposit(id: string): Promise<void> {
  await api.post(`/api/admin/finance/buyer-deposits/${id}/cancel`)
  await fetchFinance()
  addAuditLog(`Cancelled buyer deposit ${id}`, "Finance")
}

export async function cancelDepositAsync(id: string): Promise<void> {
  await api.post(`/api/admin/finance/deposits/${id}/cancel`)
  await fetchFinance()
  addAuditLog(`Cancelled deposit ${id}`, "Finance")
}

export async function approveWithdrawal(id: string): Promise<void> {
  await api.post(`/api/admin/finance/withdrawals/${id}/approve`)
  await fetchFinance()
  addAuditLog(`Approved withdrawal ${id}`, "Finance")
}

export async function rejectWithdrawal(id: string): Promise<void> {
  await api.post(`/api/admin/finance/withdrawals/${id}/reject`)
  await fetchFinance()
  addAuditLog(`Rejected withdrawal ${id}`, "Finance")
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function updateProductStatus(id: string, status: AdminProduct["status"]) {
  const idx = productsCache.findIndex(p => p.id === id)
  if (idx === -1) return
  productsCache[idx] = { ...productsCache[idx], status }
  productsCache = [...productsCache]
  notifyProductsChanged()
  void api.patch(`/api/admin/products/${id}/status`, { status }).catch(onFail(fetchProducts))
  addAuditLog(`${status === "approved" ? "Approved" : "Rejected"} product ${productsCache[idx].name}`, "Products")
}

export function deleteProduct(id: string) {
  productsCache = productsCache.filter(p => p.id !== id)
  notifyProductsChanged()
  void api.delete(`/api/admin/products/${id}`).catch(onFail(fetchProducts))
  addAuditLog(`Deleted product ${id}`, "Products")
}

export async function addProduct(p: Omit<AdminProduct, "id">): Promise<AdminProduct> {
  const tempId = `PRD-${Date.now()}`
  const newProd: AdminProduct = { ...p, id: tempId }
  productsCache = [newProd, ...productsCache]
  notifyProductsChanged()
  try {
    const res: any = await api.post("/api/admin/products", productToApi(p))
    const mapped = mapAdminProduct(res?.data ?? res)
    productsCache = productsCache.map(x => (x.id === tempId ? mapped : x))
    notifyProductsChanged()
    addAuditLog(`Added product ${p.name}`, "Products")
    return mapped
  } catch (e) {
    await fetchProducts()
    throw e
  }
}

export async function updateProduct(id: string, updates: Partial<AdminProduct>): Promise<AdminProduct> {
  const idx = productsCache.findIndex(p => p.id === id)
  if (idx === -1) throw new Error("Product not found")
  const optimistic = { ...productsCache[idx], ...updates }
  productsCache[idx] = optimistic
  productsCache = [...productsCache]
  notifyProductsChanged()
  try {
    const res: any = await api.put(`/api/admin/products/${id}`, productToApi(updates))
    const mapped = mapAdminProduct(res?.data ?? res)
    productsCache = productsCache.map(x => (x.id === id ? mapped : x))
    notifyProductsChanged()
    addAuditLog(`Updated product ${mapped.name}`, "Products")
    return mapped
  } catch (e) {
    await fetchProducts()
    throw e
  }
}

// ─── Shipments ────────────────────────────────────────────────────────────────

export function updateShipmentStatus(id: string, status: AdminShipment["status"], milestone: string) {
  const idx = shipmentsCache.findIndex(s => s.id === id)
  if (idx === -1) return
  shipmentsCache[idx] = { ...shipmentsCache[idx], status, milestone }
  shipmentsCache = [...shipmentsCache]
  void api.put(`/api/admin/shipments/${id}`, {
    status,
    current_milestone: milestone,
  }).catch(onFail(fetchShipments))
  addAuditLog(`Updated shipment ${id} → ${status}`, "Shipments")
}

export async function updateShipmentDetails(
  id: string,
  payload: {
    vessel?: string
    container?: string
    shipping_line?: string
    origin?: string
    destination?: string
    etd?: string | null
    eta?: string | null
    status?: AdminShipment["status"]
    current_milestone?: string
  },
): Promise<AdminShipment> {
  const res = await api.put<{ data: any }>(`/api/admin/shipments/${id}`, payload)
  const mapped = mapShipment(res.data)
  const idx = shipmentsCache.findIndex(s => s.id === id)
  if (idx >= 0) {
    shipmentsCache[idx] = mapped
    shipmentsCache = [...shipmentsCache]
  } else {
    await fetchShipments()
  }
  addAuditLog(`Updated shipment ${id} logistics`, "Shipments")
  return mapped
}

export async function createShipment(payload: {
  order_id?: number | null
  buyer_id: number
  product_snapshot?: string
  vessel?: string
  container?: string
  origin?: string
  destination?: string
  shipping_line?: string
  etd?: string
  eta?: string
  status?: string
}): Promise<AdminShipment> {
  const res = await api.post<{ data: any }>("/api/admin/shipments", {
    ...payload,
    status: payload.status || "pending",
    current_milestone: "Awaiting Booking",
  })
  await fetchShipments()
  addAuditLog(`Created shipment for buyer #${payload.buyer_id}`, "Shipments")
  return mapShipment(res.data)
}

export const SHIPMENT_DOCUMENT_TYPES = [
  "Bill of Lading",
  "Commercial Invoice",
  "Packing List",
  "Certificate of Origin",
  "Phytosanitary Certificate",
  "Insurance Certificate",
  "Other",
] as const

/** Keep the latest document per type (by id) when legacy duplicates exist. */
export function indexDocumentsByType(
  docs: AdminShipmentDocument[],
): Map<string, AdminShipmentDocument> {
  const map = new Map<string, AdminShipmentDocument>()
  for (const doc of docs) {
    const key = doc.type || doc.title
    if (!key) continue
    const prev = map.get(key)
    if (!prev || doc.id > prev.id) map.set(key, doc)
  }
  return map
}

/** Replace any existing same-type row instead of appending duplicates. */
export function upsertDocumentByType(
  docs: AdminShipmentDocument[],
  next: AdminShipmentDocument,
): AdminShipmentDocument[] {
  const key = next.type || next.title
  const without = docs.filter(d => (d.type || d.title) !== key)
  return [...without, next]
}

export async function refreshShipment(id: string): Promise<AdminShipment | null> {
  try {
    const res = await api.get<{ data: any }>(`/api/admin/shipments/${id}`)
    const mapped = mapShipment(res.data)
    const idx = shipmentsCache.findIndex(s => s.id === id)
    if (idx >= 0) {
      shipmentsCache[idx] = mapped
      shipmentsCache = [...shipmentsCache]
    }
    return mapped
  } catch {
    await fetchShipments()
    return shipmentsCache.find(s => s.id === id) || null
  }
}

export async function uploadShipmentDocument(
  shipmentId: string,
  file: File,
  type: string,
  title?: string,
): Promise<AdminShipmentDocument> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder", "trade-documents")
  const uploaded = await api.upload<{ data: { path: string; url: string; name: string } }>(
    "/api/uploads",
    fd,
  )
  const res = await api.post<{ data: AdminShipmentDocument }>(
    `/api/admin/shipments/${shipmentId}/documents`,
    {
      type,
      title: title || type,
      path: uploaded.data.path,
    },
  )
  const doc = res.data
  const idx = shipmentsCache.findIndex(s => s.id === shipmentId)
  if (idx >= 0) {
    const docs = upsertDocumentByType(shipmentsCache[idx].documents || [], doc)
    shipmentsCache[idx] = { ...shipmentsCache[idx], documents: docs }
    shipmentsCache = [...shipmentsCache]
  }
  addAuditLog(`Uploaded ${type} for shipment ${shipmentId}`, "Shipments")
  return doc
}

export async function deleteShipmentDocument(shipmentId: string, documentId: number): Promise<void> {
  await api.delete(`/api/admin/shipments/${shipmentId}/documents/${documentId}`)
  const idx = shipmentsCache.findIndex(s => s.id === shipmentId)
  if (idx >= 0) {
    shipmentsCache[idx] = {
      ...shipmentsCache[idx],
      documents: (shipmentsCache[idx].documents || []).filter(d => d.id !== documentId),
    }
    shipmentsCache = [...shipmentsCache]
  }
  addAuditLog(`Deleted document ${documentId} from shipment ${shipmentId}`, "Shipments")
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export async function fetchFacilityContent(type: "feed" | "ricemill" | "plant"): Promise<Record<string, unknown>> {
  const res = await api.get<{ data: Record<string, unknown> }>(`/api/admin/facility-content/${type}`)
  return res?.data ?? {}
}

export async function saveFacilityContent(type: "feed" | "ricemill" | "plant", content: Record<string, unknown>): Promise<void> {
  await api.put(`/api/admin/facility-content/${type}`, { content })
}

export async function approveKYCAsync(id: string): Promise<void> {
  await api.post(`/api/admin/compliance/kyc/${id}/approve`)
  await Promise.all([fetchCompliance(), fetchUsers()])
  addAuditLog(`Approved KYC ${id}`, "Compliance")
}

export async function rejectKYCAsync(id: string, notes?: string): Promise<void> {
  await api.post(`/api/admin/compliance/kyc/${id}/reject`, notes ? { notes } : undefined)
  await Promise.all([fetchCompliance(), fetchUsers()])
  addAuditLog(`Rejected KYC ${id}`, "Compliance")
}

export function approveKYC(id: string) {
  const idx = kycCache.findIndex(k => k.id === id)
  if (idx !== -1) {
    kycCache[idx] = { ...kycCache[idx], status: "approved" }
    kycCache = [...kycCache]
    const userIdx = usersCache.findIndex(u => u.kycApplicationId === id)
    if (userIdx !== -1) {
      usersCache[userIdx] = { ...usersCache[userIdx], kycStatus: "verified", status: "active" }
      usersCache = [...usersCache]
    }
  }
  void api.post(`/api/admin/compliance/kyc/${id}/approve`)
    .then(() => Promise.all([fetchCompliance(), fetchUsers()]))
    .catch(onFail(fetchCompliance))
  addAuditLog(`Approved KYC ${id}`, "Compliance")
}

export function rejectKYC(id: string, notes?: string) {
  const idx = kycCache.findIndex(k => k.id === id)
  if (idx !== -1) {
    kycCache[idx] = { ...kycCache[idx], status: "rejected" }
    kycCache = [...kycCache]
    const userIdx = usersCache.findIndex(u => u.kycApplicationId === id)
    if (userIdx !== -1) {
      usersCache[userIdx] = { ...usersCache[userIdx], kycStatus: "rejected" }
      usersCache = [...usersCache]
    }
  }
  void api.post(`/api/admin/compliance/kyc/${id}/reject`, notes ? { notes } : undefined)
    .then(() => Promise.all([fetchCompliance(), fetchUsers()]))
    .catch(onFail(fetchCompliance))
  addAuditLog(`Rejected KYC ${id}`, "Compliance")
}

export function updateAMLStatus(id: string, status: AdminAMLAlert["status"]) {
  const idx = amlCache.findIndex(a => a.id === id)
  if (idx === -1) return
  amlCache[idx] = { ...amlCache[idx], status }
  amlCache = [...amlCache]
  void api.patch(`/api/admin/compliance/aml/${id}`, { status }).catch(onFail(fetchCompliance))
  addAuditLog(`Updated AML alert ${id} → ${status}`, "Compliance")
}

// ─── Support ──────────────────────────────────────────────────────────────────

export function updateTicketStatus(id: string, status: AdminTicket["status"]) {
  const idx = ticketsCache.findIndex(t => t.id === id)
  if (idx === -1) return
  ticketsCache[idx] = {
    ...ticketsCache[idx],
    status,
    lastReply: fmtDateTime(new Date()),
  }
  ticketsCache = [...ticketsCache]
  void api.patch(`/api/admin/support/tickets/${id}/status`, { status }).catch(onFail(fetchTickets))
  addAuditLog(`Updated ticket ${id} → ${status}`, "Support")
}

export function addTicketReply(id: string, text: string) {
  const idx = ticketsCache.findIndex(t => t.id === id)
  if (idx === -1) return
  const msg: AdminTicketMsg = {
    from: "OG Exports Admin",
    text,
    time: fmtDateTime(new Date()),
    isAdmin: true,
  }
  ticketsCache[idx] = {
    ...ticketsCache[idx],
    messages: [...(ticketsCache[idx].messages || []), msg],
    msgs: (ticketsCache[idx].msgs || 0) + 1,
    lastReply: msg.time,
  }
  ticketsCache = [...ticketsCache]
  void api.post(`/api/admin/support/tickets/${id}/reply`, { body: text }).catch(onFail(fetchTickets))
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export function updateLeadStage(id: string, stage: string) {
  const idx = crmLeadsCache.findIndex(l => l.id === id)
  if (idx === -1) return
  crmLeadsCache[idx] = { ...crmLeadsCache[idx], stage }
  crmLeadsCache = [...crmLeadsCache]
  void api.put(`/api/admin/crm/leads/${id}`, { stage }).catch(onFail(fetchCrm))
  addAuditLog(`Moved lead ${crmLeadsCache[idx].name} → ${stage}`, "CRM")
}

export function addCRMActivity(activity: Omit<AdminCRMActivity, "id">) {
  const tempId = `ACT-${Date.now()}`
  crmActivitiesCache = [{ ...activity, id: tempId }, ...crmActivitiesCache]
  const lead = crmLeadsCache.find(l => l.name === activity.lead || l.id === activity.lead)
  if (lead) {
    void api.post(`/api/admin/crm/leads/${lead.id}/activities`, {
      type: activity.type,
      note: activity.note,
    }).then(() => fetchCrm()).catch(onFail(fetchCrm))
  }
}

// ─── Investments ──────────────────────────────────────────────────────────────

export async function updateProjectStatus(id: string, status: AdminInvestProject["status"]) {
  const idx = investProjectsCache.findIndex(p => p.id === id)
  if (idx !== -1) {
    investProjectsCache[idx] = { ...investProjectsCache[idx], status }
    investProjectsCache = [...investProjectsCache]
  }
  try {
    const response = await api.put<{ data?: AdminInvestProject; settlement?: {
      settled_count?: number
      principal?: number
      profit?: number
      total_return?: number
      settlement_date?: string
    } }>(`/api/admin/investment-projects/${id}`, { status })
    await fetchInvestments("admin")
    addAuditLog(`Updated investment project ${id} → ${status}`, "Investments")
    return response
  } catch (error) {
    await fetchInvestments("admin")
    throw error
  }
}

export function addProject(proj: Omit<AdminInvestProject, "id">): string {
  const tempId = `P-${Date.now().toString().slice(-4)}`
  investProjectsCache = [{ ...proj, id: tempId, documents: proj.documents || [] }, ...investProjectsCache]
  void api.post("/api/admin/investment-projects", projectToApi(proj))
    .then((res: any) => {
      const mapped = mapInvestProject(res?.data ?? res)
      investProjectsCache = investProjectsCache.map(p => (p.id === tempId ? mapped : p))
    })
    .catch(onFail(() => fetchInvestments("admin")))
  addAuditLog(`Added investment project ${tempId} — ${proj.title}`, "Investments")
  return tempId
}

export async function createProjectAsync(proj: Omit<AdminInvestProject, "id">): Promise<AdminInvestProject> {
  const res: any = await api.post("/api/admin/investment-projects", projectToApi(proj))
  const mapped = mapInvestProject(res?.data ?? res)
  investProjectsCache = [mapped, ...investProjectsCache.filter(p => p.id !== mapped.id)]
  addAuditLog(`Added investment project ${mapped.id} — ${mapped.title}`, "Investments")
  return mapped
}

export function editProject(id: string, updates: Partial<AdminInvestProject>) {
  const idx = investProjectsCache.findIndex(p => p.id === id)
  if (idx === -1) return
  investProjectsCache[idx] = { ...investProjectsCache[idx], ...updates }
  investProjectsCache = [...investProjectsCache]
  void api.put(`/api/admin/investment-projects/${id}`, projectToApi(updates)).catch(onFail(() => fetchInvestments("admin")))
  addAuditLog(`Edited project ${id}`, "Investments")
}

export async function updateProjectAsync(id: string, updates: Partial<AdminInvestProject>): Promise<AdminInvestProject> {
  const res: any = await api.put(`/api/admin/investment-projects/${id}`, projectToApi(updates))
  const mapped = mapInvestProject(res?.data ?? res)
  const idx = investProjectsCache.findIndex(p => p.id === id)
  if (idx >= 0) {
    investProjectsCache[idx] = mapped
    investProjectsCache = [...investProjectsCache]
  } else {
    investProjectsCache = [mapped, ...investProjectsCache]
  }
  addAuditLog(`Edited project ${id}`, "Investments")
  return mapped
}

function mapProjectInvestment(row: any): AdminProjectInvestment {
  const investor = row.investor
  const amountCurrency = row.amount_currency || row.wallet_currency || investor?.currency || "USD"
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    investorId: String(row.investor_id ?? ""),
    investorName: row.investor_name || investor?.name || "—",
    investorEmail: row.investor_email || investor?.email || "",
    amount: Number(row.amount) || 0,
    amountFormatted: formatProjectInvestmentAmount(Number(row.amount) || 0, {
      ...investor,
      amount_currency: amountCurrency,
      wallet_currency: row.wallet_currency || investor?.wallet_currency,
    }),
    profitAmount: row.profit_amount != null ? Number(row.profit_amount) : null,
    profitAmountFormatted: row.profit_amount != null
      ? formatProjectInvestmentAmount(Number(row.profit_amount), {
          ...investor,
          amount_currency: amountCurrency,
          wallet_currency: row.wallet_currency || investor?.wallet_currency,
        })
      : null,
    status: String(row.status || "pending"),
    reference: row.reference || `INV-${row.id}`,
    investedAt: row.invested_at || "",
    approvedAt: row.approved_at || undefined,
    investor,
  }
}

export async function fetchProjectDetail(id: string): Promise<AdminProjectDetail> {
  const res: any = await api.get(`/api/admin/investment-projects/${id}/detail`)
  const payload = res?.data ?? res
  const project = mapInvestProject(payload.project ?? {})
  // Keep ISO dates for editable date inputs
  if (payload.project?.etd) project.etd = String(payload.project.etd).slice(0, 10)
  if (payload.project?.eta) project.eta = String(payload.project.eta).slice(0, 10)
  if (payload.project?.meta?.completion) project.completion = String(payload.project.meta.completion)
  const statsRaw = payload.stats || {}
  return {
    project,
    stats: {
      targetAmount: Number(statsRaw.target_amount) || 0,
      raisedAmount: Number(statsRaw.raised_amount) || 0,
      pendingReserved: Number(statsRaw.pending_reserved) || 0,
      remainingAmount: Number(statsRaw.remaining_amount) ?? 0,
      investorsCount: Number(statsRaw.investors_count) || 0,
      pendingCount: Number(statsRaw.pending_count) || 0,
      isFull: Boolean(statsRaw.is_full),
      slotsRemaining: Number(statsRaw.slots_remaining) || 0,
    },
    investments: Array.isArray(payload.investments)
      ? payload.investments.map(mapProjectInvestment)
      : [],
  }
}

export async function fetchProjectStageUpdates(id: string): Promise<AdminProjectStageUpdate[]> {
  const response: any = await api.get(`/api/admin/projects/${id}/stage-updates`)
  const payload = response?.data ?? response
  return Array.isArray(payload) ? payload : []
}

export async function createProjectStageUpdate(
  id: string,
  input: AdminProjectStageUpdateInput,
): Promise<AdminProjectStageUpdate> {
  const response: any = await api.post(`/api/admin/projects/${id}/stage-updates`, input)
  return response?.data ?? response
}

export async function approveProjectInvestment(projectId: string, investmentId: string) {
  const res: any = await api.post(
    `/api/admin/investment-projects/${projectId}/investments/${investmentId}/approve`,
  )
  addAuditLog(`Approved investment ${investmentId} on project ${projectId}`, "Investments")
  await fetchInvestments("admin")
  return res
}

export async function rejectProjectInvestment(projectId: string, investmentId: string) {
  const res: any = await api.post(
    `/api/admin/investment-projects/${projectId}/investments/${investmentId}/reject`,
  )
  addAuditLog(`Rejected investment ${investmentId} on project ${projectId}`, "Investments")
  await fetchInvestments("admin")
  return res
}

export async function approveNextProjectInvestment(projectId: string) {
  const res: any = await api.post(
    `/api/admin/investment-projects/${projectId}/investments/approve-next`,
  )
  addAuditLog(`Approved next pending investment on project ${projectId}`, "Investments")
  await fetchInvestments("admin")
  return res
}

function mapAdminProjectDeposit(row: any): AdminProjectDeposit {
  const rawStatus = String(row.status || "pending").toLowerCase()
  const status: AdminProjectDeposit["status"] =
    rawStatus === "active" ? "active"
      : rawStatus === "completed" ? "completed"
        : rawStatus === "cancelled" ? "cancelled"
          : "pending"
  const project = row.project || {}
  const investor = row.investor || {}
  const imagePath = project.image_url || project.imageUrl
  const avatarPath = investor.avatar_url || investor.avatarUrl
  const amount = Number(row.amount) || 0
  const amountPkr = row.amount_pkr != null ? Number(row.amount_pkr) : null
  const profitAmount = row.profit_amount != null ? Number(row.profit_amount) : null
  const profitAmountPkr = row.profit_amount_pkr != null ? Number(row.profit_amount_pkr) : null
  const amountCurrency = row.amount_currency || row.wallet_currency || investor?.currency || "USD"
  const investorPayload = {
    ...investor,
    amount_currency: amountCurrency,
    wallet_currency: row.wallet_currency || investor?.wallet_currency,
    amount_pkr: amountPkr,
  }
  return {
    id: String(row.id),
    reference: row.reference || `INV-${row.id}`,
    amount,
    amountPkr,
    amountCurrency,
    amountFormatted: formatProjectInvestmentAmount(amount, investorPayload, {
      pkrAmount: amountPkr,
      usdAmount: amount,
    }),
    profitAmount,
    profitAmountPkr,
    profitAmountFormatted: profitAmount != null
      ? formatProjectInvestmentAmount(profitAmount, investorPayload, {
        pkrAmount: profitAmountPkr,
        usdAmount: profitAmount,
      })
      : null,
    totalReturn: row.total_return != null ? Number(row.total_return) : undefined,
    settlementDate: row.settlement_date || row.settled_at || undefined,
    status,
    investedAt: row.invested_at || row.created_at || "",
    approvedAt: row.approved_at || undefined,
    createdAt: row.created_at || undefined,
    paymentSource: row.payment_source || undefined,
    paymentSourceLabel: row.payment_source_label || undefined,
    walletFundingDeposits: Array.isArray(row.wallet_funding_deposits)
      ? row.wallet_funding_deposits.map((dep: any) => ({
        id: String(dep.id),
        reference: dep.reference || `OGDEP-INV-${String(dep.id).padStart(3, "0")}`,
        method: dep.method || "",
        methodLabel: dep.method_label || dep.method || "Unknown",
        amount: Number(dep.amount) || 0,
        currency: dep.currency || "USD",
        reviewedAt: dep.reviewed_at || undefined,
        projectId: dep.project_id != null ? String(dep.project_id) : undefined,
      }))
      : undefined,
    project: {
      id: String(project.id ?? row.project_id ?? ""),
      title: project.title || "—",
      reference: project.reference || undefined,
      type: project.type,
      status: project.status,
      imageUrl: imagePath ? resolveMediaUrl(imagePath) : undefined,
      commodity: project.commodity,
      variety: project.variety,
      description: project.description,
      container_type: project.container_type,
      vessel: project.vessel,
      shipping_line: project.shipping_line,
      port_of_loading: project.port_of_loading,
      port_of_discharge: project.port_of_discharge,
      origin: project.origin,
      destination: project.destination,
      incoterm: project.incoterm,
      etd: project.etd,
      eta: project.eta,
      expected_return_pct: project.expected_return_pct != null ? Number(project.expected_return_pct) : undefined,
      investment_period_days: project.investment_period_days != null ? Number(project.investment_period_days) : undefined,
      target_amount: project.target_amount != null ? Number(project.target_amount) : undefined,
      raised_amount: project.raised_amount != null ? Number(project.raised_amount) : undefined,
      pending_reserved: project.pending_reserved != null ? Number(project.pending_reserved) : undefined,
      remaining_amount: project.remaining_amount != null ? Number(project.remaining_amount) : undefined,
      funding_percentage: project.funding_percentage != null ? Number(project.funding_percentage) : undefined,
      investors_count: project.investors_count != null ? Number(project.investors_count) : undefined,
      current_project_stage: project.current_project_stage,
      location: project.location,
      completion: project.completion,
      meta: project.meta && typeof project.meta === "object" ? project.meta : undefined,
    },
    investor: {
      id: String(investor.id ?? row.investor_id ?? ""),
      name: investor.name || "—",
      email: investor.email || "",
      avatarUrl: avatarPath ? resolveMediaUrl(avatarPath) : undefined,
      country: investor.country,
      display_pkr: investor.display_pkr ?? investor.displayPkr,
      currency: investor.currency ?? investor.display_currency,
      wallet_currency: investor.wallet_currency ?? row.wallet_currency,
    },
  }
}

export async function fetchProjectInvestments(params?: {
  status?: string
  project_id?: string
  project_type?: string
  search?: string
  page?: number
  per_page?: number
}): Promise<{ data: AdminProjectDeposit[]; total: number; last_page: number }> {
  const res: any = await api.get("/api/admin/project-investments", params)
  const page = unwrapPage(res)
  const perPage = params?.per_page ?? 20
  const total = page.meta.total ?? page.data.length
  return {
    data: page.data.map(mapAdminProjectDeposit),
    total,
    last_page: page.meta.last_page ?? Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function fetchContainerProjects(params?: {
  status?: string
  search?: string
  page?: number
  per_page?: number
}): Promise<{ data: AdminInvestProject[]; total: number; last_page: number }> {
  const res: any = await api.get("/api/admin/investment-projects", {
    type: "container",
    ...params,
  })
  const page = unwrapPage(res)
  const perPage = params?.per_page ?? 10
  const total = page.meta.total ?? page.data.length
  return {
    data: page.data.map(mapInvestProject),
    total,
    last_page: page.meta.last_page ?? Math.max(1, Math.ceil(total / perPage)),
  }
}

export type AdminActiveProjectApiRow = {
  project: Record<string, unknown>
  investments: Array<{
    id: number
    reference: string
    amount: number
    status: string
    invested_at?: string
    approved_at?: string
    investor?: { id?: number; name?: string; email?: string }
  }>
  capacity: {
    target_amount: number
    active_raised: number
    pending_reserved: number
    remaining_capacity: number
  }
}

export async function fetchActiveProjects(params?: {
  project_type?: string
  search?: string
  page?: number
  per_page?: number
}): Promise<{ data: AdminActiveProjectApiRow[]; total: number; last_page: number }> {
  const res: any = await api.get("/api/admin/investment-projects/active", params)
  const page = unwrapPage(res)
  const perPage = params?.per_page ?? 100
  const total = page.meta.total ?? page.data.length
  return {
    data: page.data as AdminActiveProjectApiRow[],
    total,
    last_page: page.meta.last_page ?? Math.max(1, Math.ceil(total / perPage)),
  }
}

export async function fetchProfitDistributions(params?: {
  project_type?: string
  project_id?: string
  investor_id?: string
  investment_id?: string
  page?: number
  per_page?: number
}): Promise<{ data: Array<{
  id: number
  investment_id: number
  investment_reference?: string
  project_id: number
  project_title?: string
  project_type: string
  investor_id: number
  investor_name?: string
  invested_amount: number
  profit_amount: number
  total_return: number
  roi_pct: number
  distributed_at?: string
}>; total: number }> {
  const res: any = await api.get("/api/admin/investment-profit-distributions", params)
  const page = unwrapPage(res)
  return {
    data: page.data,
    total: page.meta?.total ?? page.data.length,
  }
}

export type AdminInvestmentPayoutRow = {
  id: number
  investment_id: number
  investment_reference?: string | null
  investment_status: string
  project_id: number
  project_title?: string | null
  project_type?: string | null
  investor_id: number
  investor_name?: string | null
  investor_email?: string | null
  invested_amount: number
  amount_currency: string
  payout_status?: "scheduled" | "processing" | "distributed" | null
  planned_distribution_date?: string | null
  distributed_at?: string | null
}

export async function fetchInvestmentPayouts(params?: {
  page?: number
  per_page?: number
  search?: string
}): Promise<{ data: AdminInvestmentPayoutRow[]; total: number; last_page: number }> {
  const res: any = await api.get("/api/admin/investment-payout-progress", params)
  const page = unwrapPage(res)
  const data = page.data as AdminInvestmentPayoutRow[]
  return {
    data,
    total: page.meta?.total ?? data.length,
    last_page: page.meta?.last_page ?? 1,
  }
}

export async function updateInvestmentPayoutProgress(
  investmentId: number,
  status: "scheduled" | "processing" | null,
  plannedDistributionDate: string | null,
): Promise<void> {
  await api.patch(`/api/admin/investment-payout-progress/${investmentId}`, {
    status,
    planned_distribution_date: plannedDistributionDate,
  })
  addAuditLog(
    `Updated payout progress for investment ${investmentId} to ${status || "awaiting update"}`,
    "Finance",
  )
}

export async function fetchProjectInvestmentDetail(id: string): Promise<AdminProjectDeposit> {
  const res: any = await api.get(`/api/admin/project-investments/${id}`)
  return mapAdminProjectDeposit(res?.data ?? res)
}

export async function approveProjectInvestmentById(id: string): Promise<AdminProjectDeposit> {
  const res: any = await api.post(`/api/admin/project-investments/${id}/approve`)
  addAuditLog(`Approved project investment ${id}`, "Finance")
  await fetchInvestments("admin")
  return mapAdminProjectDeposit(res?.data ?? res)
}

export async function rejectProjectInvestmentById(id: string): Promise<AdminProjectDeposit> {
  const res: any = await api.post(`/api/admin/project-investments/${id}/reject`)
  addAuditLog(`Rejected project investment ${id}`, "Finance")
  await fetchInvestments("admin")
  return mapAdminProjectDeposit(res?.data ?? res)
}

export async function updateProjectInvestmentStatus(
  id: string,
  status: AdminProjectDeposit["status"],
): Promise<AdminProjectDeposit> {
  const res: any = await api.patch(`/api/admin/project-investments/${id}/status`, { status })
  addAuditLog(`Updated project investment ${id} status to ${status}`, "Finance")
  await fetchInvestments("admin")
  return mapAdminProjectDeposit(res?.data ?? res)
}

export const INVESTMENT_DOCUMENT_TITLES = [
  "Proforma Invoice",
  "Bill of Lading Draft",
  "Investment Agreement",
  "Other",
] as const

export async function uploadProjectDocument(
  projectId: string,
  file: File,
  title: string,
): Promise<AdminInvestProjectDocument> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("folder", "investment-documents")
  const uploaded = await api.upload<{ data: { path: string; url: string; name: string } }>(
    "/api/uploads",
    fd,
  )
  const res = await api.post<{ data: any }>(
    `/api/admin/investment-projects/${projectId}/documents`,
    {
      title,
      path: uploaded.data.path,
      original_name: file.name,
    },
  )
  const raw = res.data
  const doc: AdminInvestProjectDocument = {
    id: Number(raw.id),
    title: raw.title || title,
    name: raw.title || title,
    size: raw.size || "—",
    sizeBytes: raw.size_bytes != null ? Number(raw.size_bytes) : file.size,
    originalName: raw.original_name || file.name,
    path: raw.path,
    url: raw.url || (raw.path ? resolveMediaUrl(raw.path) : uploaded.data.url),
    downloadUrl: raw.download_url || raw.url || (raw.path ? resolveMediaUrl(raw.path) : uploaded.data.url),
  }
  const idx = investProjectsCache.findIndex(p => p.id === projectId)
  if (idx >= 0) {
    const docs = [...(investProjectsCache[idx].documents || []), doc]
    investProjectsCache[idx] = { ...investProjectsCache[idx], documents: docs }
    investProjectsCache = [...investProjectsCache]
  }
  addAuditLog(`Uploaded document "${title}" for project ${projectId}`, "Investments")
  return doc
}

export async function deleteProjectDocument(projectId: string, documentId: number): Promise<void> {
  await api.delete(`/api/admin/investment-projects/${projectId}/documents/${documentId}`)
  const idx = investProjectsCache.findIndex(p => p.id === projectId)
  if (idx >= 0) {
    investProjectsCache[idx] = {
      ...investProjectsCache[idx],
      documents: (investProjectsCache[idx].documents || []).filter(d => d.id !== documentId),
    }
    investProjectsCache = [...investProjectsCache]
  }
  addAuditLog(`Deleted document ${documentId} from project ${projectId}`, "Investments")
}

export function deleteProject(id: string) {
  investProjectsCache = investProjectsCache.filter(p => p.id !== id)
  void api.delete(`/api/admin/investment-projects/${id}`).catch(onFail(() => fetchInvestments("admin")))
  addAuditLog(`Deleted investment project ${id}`, "Investments")
}

export function creditDepositToProject(projectId: string, amountUSD: number) {
  if (!projectId || amountUSD <= 0) return
  const idx = investProjectsCache.findIndex(p => p.id === projectId)
  if (idx === -1) return
  const raised = Math.min(investProjectsCache[idx].target, (investProjectsCache[idx].raised || 0) + amountUSD)
  const investors = (investProjectsCache[idx].investors || 0) + 1
  let status = investProjectsCache[idx].status
  if (raised >= investProjectsCache[idx].target && status === "funding") status = "investment_confirmed"
  investProjectsCache[idx] = { ...investProjectsCache[idx], raised, investors, status }
  investProjectsCache = [...investProjectsCache]
  void api.put(`/api/admin/investment-projects/${projectId}`, {
    raised_amount: raised,
    investors_count: investors,
    status,
  }).catch(onFail(() => fetchInvestments("admin")))
  addAuditLog(`Project ${projectId} raised +$${amountUSD}`, "Investments")
}

// ─── Role submits ─────────────────────────────────────────────────────────────

export async function submitInvestorDeposit(deposit: {
  investor: string; email: string; amount: string; method: string; ref: string
  projectId?: string; projectTitle?: string; amountNum?: number; currency?: string
  proofPath?: string; bankAccountId?: string; bankAccountName?: string; note?: string
}): Promise<{
  id: string
  reference: string
  bankReference?: string
  status?: string
  message?: string
  serverRecord: Record<string, unknown>
}> {
  const id = `DEP-${Date.now().toString().slice(-4)}`
  const currency = String(deposit.currency || "USD").toUpperCase()
  const supported = ["USD", "GBP", "EUR", "CNY", "PKR", "SAR", "AED", "OMR", "QAR"]
  const depositCurrency = supported.includes(currency) ? currency : "USD"
  const bankRef = deposit.ref || `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const newDep: AdminDeposit = {
    id,
    investor: deposit.investor,
    email: deposit.email,
    amount: deposit.amount,
    method: deposit.method,
    ref: "",
    bankRef,
    date: fmtDate(new Date()),
    status: "pending",
  }
  depositsCache = [newDep, ...depositsCache]

  const amountNum = deposit.amountNum ?? parseMoney(deposit.amount)
  try {
    const response: any = await api.post("/api/investor/deposits", {
      amount: amountNum,
      currency: depositCurrency,
      method: deposit.method,
      bank_reference: bankRef,
      project_id: deposit.projectId && /^\d+$/.test(deposit.projectId) ? Number(deposit.projectId) : undefined,
      proof_path: deposit.proofPath || undefined,
      bank_account_id: deposit.bankAccountId || undefined,
      bank_account_name: deposit.bankAccountName || undefined,
      note: deposit.note || undefined,
    })
    const responseRecord: any = response?.data ?? response
    const mapped = mapDeposit(responseRecord)
    depositsCache = depositsCache.map(d => (d.id === id ? mapped : d))
    addAuditLog(`Investor deposit submitted ${mapped.id}`, "Finance")
    const status = [responseRecord?.status, responseRecord?.review_status, responseRecord?.state]
      .find(value => typeof value === "string" && value.trim())
    const message = [response?.message, responseRecord?.message]
      .find(value => typeof value === "string" && value.trim())
    return {
      id: mapped.id,
      reference: mapped.ref,
      bankReference: mapped.bankRef,
      status: status ? String(status).trim() : undefined,
      message: message ? String(message).trim() : undefined,
      serverRecord: responseRecord as Record<string, unknown>,
    }
  } catch (error) {
    depositsCache = depositsCache.filter(d => d.id !== id)
    throw error
  }
}

export async function submitInvestorWithdrawal(withdrawal: {
  investor: string
  amount: number | string
  bank: string
  ref?: string
  bankDetails?: Record<string, string>
  note?: string
}): Promise<{ id: string; error?: string }> {
  const amountNum = typeof withdrawal.amount === "number"
    ? withdrawal.amount
    : parseMoney(withdrawal.amount)
  if (!amountNum || amountNum <= 0) {
    return { id: "", error: "Enter a valid withdrawal amount." }
  }

  const id = `WD-${Date.now().toString().slice(-4)}`
  const ref = withdrawal.ref || `WR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const bankDetails = {
    bank: withdrawal.bank,
    reference: ref,
    ...(withdrawal.bankDetails || {}),
  }
  const newWd: AdminWithdrawal = {
    id,
    investor: withdrawal.investor,
    amount: `$${amountNum.toLocaleString()}`,
    bank: withdrawal.bank,
    ref,
    requested: fmtDate(new Date()),
    status: "pending",
    note: withdrawal.note || "",
  }
  withdrawalsCache = [newWd, ...withdrawalsCache]

  try {
    const res: any = await api.post("/api/investor/withdrawals", {
      amount: amountNum,
      bank_details: bankDetails,
      note: withdrawal.note,
    })
    const mapped = mapWithdrawal(res?.data ?? res)
    withdrawalsCache = withdrawalsCache.map(w => (w.id === id ? mapped : w))
    addAuditLog(`Investor withdrawal requested ${mapped.id}`, "Finance")
    return { id: mapped.id }
  } catch (err: any) {
    withdrawalsCache = withdrawalsCache.filter(w => w.id !== id)
    const msg =
      err?.errors?.amount?.[0]
      || (Array.isArray(err?.errors?.amount) ? err.errors.amount[0] : null)
      || err?.message
      || "Withdrawal request failed."
    return { id: "", error: String(msg) }
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function saveSettings(settings: AdminSettings) {
  settingsCache = settings
  void api.put("/api/admin/cms/platform-settings", {
    site_name: settings.siteName,
    tagline: settings.tagline,
    support_email: settings.supportEmail,
    whatsapp: settings.whatsapp,
    maintenance_mode: settings.maintenanceMode,
    registration_open: settings.registrationOpen,
    kyc_required: settings.kycRequired,
    investment_open: settings.investmentOpen,
    investment_module_enabled: settings.investmentModuleEnabled,
    supplier_module_enabled: settings.supplierModuleEnabled,
    admin_otp_enabled: settings.adminOtpEnabled,
    invest_plant_visible: settings.investPlantVisible,
    invest_feeds_visible: settings.investFeedsVisible,
    invest_ricemill_visible: settings.investRicemillVisible,
    invest_yellow_maize_visible: settings.investYellowMaizeVisible,
    invest_produce_visible: settings.investProduceVisible,
    invest_pkr_display_enabled: settings.investPkrDisplayEnabled,
    invest_dual_currency_enabled: settings.investDualCurrencyEnabled,
    supplier_pkr_display_enabled: settings.supplierPkrDisplayEnabled,
    buyer_pkr_display_enabled: settings.buyerPkrDisplayEnabled,
    currency: settings.currency,
    min_investment: settings.minInvestment,
    payment_methods: settings.paymentMethods,
    notification_prefs: settings.notifications,
  }).catch(onFail(fetchSettings))
  addAuditLog("Updated system settings", "Settings")
}

// ─── Supplier offers ──────────────────────────────────────────────────────────

export type SupplierOfferStats = {
  total: number
  pending: number
  approved: number
  hold: number
  rejected: number
  avg_rating?: number
}

export type SupplierOfferPage = {
  data: SupplierOffer[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export async function refreshSupplierOffers(params?: {
  page?: number
  per_page?: number
  status?: string
  category?: string
  search?: string
  sort?: string
  scope?: "admin" | "supplier"
}): Promise<SupplierOfferPage> {
  const scope = params?.scope ?? "admin"
  const query = {
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 10,
    status: params?.status && params.status !== "all" ? params.status : undefined,
    category: params?.category && params.category !== "all" ? params.category : undefined,
    search: params?.search || undefined,
    sort: params?.sort || undefined,
  }

  const path = scope === "supplier" ? "/api/supplier/offers" : "/api/admin/supplier-offers"
  const res = await api.get(path, query)
  const page = unwrapPage(res)
  const data = page.data.map(mapOffer)
  supplierOffersCache = data
  return {
    data,
    current_page: Number(page.meta?.current_page ?? 1),
    last_page: Number(page.meta?.last_page ?? 1),
    per_page: Number(page.meta?.per_page ?? 10),
    total: Number(page.meta?.total ?? data.length),
  }
}

export async function fetchSupplierOfferStats(scope: "admin" | "supplier" = "admin"): Promise<SupplierOfferStats> {
  const path = scope === "supplier" ? "/api/supplier/offers/stats" : "/api/admin/supplier-offers/stats"
  const res: any = await api.get(path)
  const d = res?.data ?? res ?? {}
  return {
    total: Number(d.total ?? 0),
    pending: Number(d.pending ?? 0),
    approved: Number(d.approved ?? 0),
    hold: Number(d.hold ?? 0),
    rejected: Number(d.rejected ?? 0),
    avg_rating: d.avg_rating != null ? Number(d.avg_rating) : undefined,
  }
}

export async function fetchSupplierOfferById(id: string): Promise<SupplierOffer | null> {
  try {
    const res: any = await api.get(`/api/admin/supplier-offers/${id}`)
    const mapped = mapOffer(res?.data ?? res)
    if (!mapped?.id) return null
    const idx = supplierOffersCache.findIndex(o => o.id === id || o.id === mapped.id)
    if (idx >= 0) {
      supplierOffersCache[idx] = mapped
      supplierOffersCache = [...supplierOffersCache]
    } else {
      supplierOffersCache = [mapped, ...supplierOffersCache]
    }
    return mapped
  } catch (e) {
    console.error("fetchSupplierOfferById failed", e)
    return null
  }
}

export async function uploadOfferMedia(file: File, type: "image" | "video" = "image"): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("type", type)
  const res: any = await api.upload("/api/supplier/offers/media", fd)
  const raw = res?.data?.path || res?.data?.url || res?.path || res?.url
  if (!raw) throw new Error("Upload failed")
  return toStoredMediaPath(String(raw)) || String(raw)
}

export function updateSupplierOffer(id: string, updates: Partial<SupplierOffer>) {
  const idx = supplierOffersCache.findIndex(o => o.id === id)
  if (idx === -1) return
  supplierOffersCache[idx] = { ...supplierOffersCache[idx], ...updates }
  supplierOffersCache = [...supplierOffersCache]
  if (updates.status) {
    void api.patch(`/api/admin/supplier-offers/${id}/status`, { status: updates.status })
      .then((res: any) => {
        const mapped = mapOffer(res?.data ?? res)
        const i = supplierOffersCache.findIndex(o => o.id === id)
        if (i >= 0) {
          supplierOffersCache[i] = mapped
          supplierOffersCache = [...supplierOffersCache]
        }
      })
      .catch(onFail(fetchSupplierOffers))
  }
}

export function addOfferNote(id: string, text: string) {
  const idx = supplierOffersCache.findIndex(o => o.id === id)
  if (idx === -1) return
  const note: SupplierOfferNote = {
    text,
    at: new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }),
  }
  supplierOffersCache[idx] = {
    ...supplierOffersCache[idx],
    notes: [...(supplierOffersCache[idx].notes ?? []), note],
  }
  supplierOffersCache = [...supplierOffersCache]
  void api.post(`/api/admin/supplier-offers/${id}/notes`, { text }).catch(onFail(fetchSupplierOffers))
}

/** Rate a single offer; backend also updates supplier profile average. */
export function rateOffer(offerId: string, rating: number) {
  const idx = supplierOffersCache.findIndex(o => o.id === offerId)
  if (idx >= 0) {
    supplierOffersCache[idx] = { ...supplierOffersCache[idx], rating }
    supplierOffersCache = [...supplierOffersCache]
  }
  void api.post(`/api/admin/supplier-offers/${offerId}/rate`, { rating })
    .then((res: any) => {
      const mapped = mapOffer(res?.data ?? res)
      const i = supplierOffersCache.findIndex(o => o.id === offerId)
      if (i >= 0) {
        supplierOffersCache[i] = mapped
        supplierOffersCache = [...supplierOffersCache]
      }
    })
    .catch(onFail(fetchSupplierOffers))
}

/** @deprecated Prefer rateOffer(offerId, rating) */
export function rateSupplier(supplierId: string, rating: number) {
  const target = supplierOffersCache.find(o => o.supplierId === supplierId)
  if (target) rateOffer(target.id, rating)
}

export async function addSupplierOffer(offer: Omit<SupplierOffer, "id" | "notes">): Promise<string> {
  const optimisticId = `SOF-${Date.now().toString().slice(-3)}`
  const newOffer: SupplierOffer = { ...offer, id: optimisticId, notes: [] }
  supplierOffersCache = [newOffer, ...supplierOffersCache]

  const currency = offer.currency
    || (offer.supplierCountry?.toLowerCase() === "pakistan" ? "PKR" : "USD")

  try {
    const res: any = await api.post("/api/supplier/offers", {
      category: offer.category,
      product_name: offer.productName,
      origin: offer.origin,
      specifications: offer.specifications,
      available_qty: offer.availableQty,
      price_fob: offer.priceFob,
      currency,
      incoterm: offer.incoterm,
      price_unit: offer.priceUnit,
      moq: offer.moq,
      lead_time: offer.leadTime,
      packaging: offer.packaging,
      payment_terms: offer.paymentTerms,
      certifications: offer.certifications,
      valid_until: offer.validUntil || undefined,
      hs_code: offer.hsCode,
      images: offer.images,
      video: offer.video || undefined,
      remarks: offer.remarks || undefined,
    })
    const mapped = mapOffer(res?.data ?? res)
    supplierOffersCache = supplierOffersCache.map(o => (o.id === optimisticId ? mapped : o))
    addAuditLog(`Supplier offer submitted ${mapped.id} — ${offer.productName}`, "Suppliers")
    return mapped.id
  } catch (error) {
    supplierOffersCache = supplierOffersCache.filter(o => o.id !== optimisticId)
    throw error
  }
}

// ─── FOB / Buyer quotes ───────────────────────────────────────────────────────

export function saveFobPrice(product: string, price: number) {
  const updatedAt = fmtDate(new Date())
  const idx = fobPricesCache.findIndex(p => p.product === product)
  if (idx === -1) fobPricesCache = [...fobPricesCache, { product, price, updatedAt }]
  else {
    fobPricesCache[idx] = { product, price, updatedAt }
    fobPricesCache = [...fobPricesCache]
  }

  const existingId = fobIdByProduct.get(product)
  if (existingId) {
    void api.put(`/api/admin/fob-prices/${existingId}`, {
      product_name: product,
      price_per_mt: price,
    }).catch(onFail(fetchFobPrices))
  } else {
    void api.post("/api/admin/fob-prices", {
      product_name: product,
      price_per_mt: price,
    }).then((res: any) => {
      const row = res?.data ?? res
      if (row?.id != null) fobIdByProduct.set(product, String(row.id))
    }).catch(onFail(fetchFobPrices))
  }
  addAuditLog(`Daily FOB price updated — ${product} → $${price}/MT`, "Trade Desk")
}

export function removeFobPrice(product: string) {
  fobPricesCache = fobPricesCache.filter(p => p.product !== product)
  const existingId = fobIdByProduct.get(product)
  fobIdByProduct.delete(product)
  if (existingId) {
    void api.delete(`/api/admin/fob-prices/${existingId}`).catch(onFail(fetchFobPrices))
  }
  addAuditLog(`FOB price removed — ${product}`, "Trade Desk")
}

export function requestQuotation(req: {
  rfqId: string; buyer: string; product: string; qtyMT: number
  incoterm: string; destination: string; paymentTerms: string
}): BuyerQuote {
  const now = new Date()
  const valid = new Date(now.getTime() + 7 * 86400000)
  const fob = fobPricesCache.find(p => p.product === req.product)
  const isAutoFob = req.incoterm === "FOB" && !!fob

  const quote: BuyerQuote = {
    id: `QT-${Date.now().toString().slice(-5)}`,
    rfqId: req.rfqId,
    buyer: req.buyer,
    product: req.product,
    qtyMT: req.qtyMT,
    incoterm: req.incoterm,
    destination: req.destination,
    paymentTerms: req.paymentTerms,
    date: fmtDate(now),
    validUntil: isAutoFob ? fmtDate(valid) : "—",
    status: isAutoFob ? "sent" : "pending_admin",
    source: isAutoFob ? "auto-fob" : "admin",
    fobUnitPrice: fob?.price ?? 0,
    freight: 0,
    insurance: 0,
    docFee: isAutoFob ? 150 : 0,
    notes: isAutoFob
      ? `Auto-generated from daily FOB price sheet (${fob!.updatedAt}). Price valid 7 days, subject to Proforma Invoice confirmation.`
      : "",
  }
  buyerQuotesCache = [quote, ...buyerQuotesCache]

  // Persist via admin quotation create when RFQ id is numeric (admin session)
  if (/^\d+$/.test(req.rfqId) && isAutoFob) {
    void api.post(`/api/admin/rfqs/${req.rfqId}/quotations`, {
      qty_mt: req.qtyMT,
      incoterm: req.incoterm,
      destination: req.destination,
      payment_terms: req.paymentTerms,
      fob_unit_price: quote.fobUnitPrice,
      freight: 0,
      insurance: 0,
      doc_fee: quote.docFee,
      notes: quote.notes,
      send: true,
      valid_until: valid.toISOString().slice(0, 10),
    }).then((res: any) => {
      const mapped = mapBuyerQuote(res?.data ?? res)
      buyerQuotesCache = buyerQuotesCache.map(q => (q.id === quote.id ? mapped : q))
      void fetchQuotations()
    }).catch(() => { /* local quote remains */ })
  }

  addAuditLog(
    isAutoFob
      ? `Auto FOB quotation ${quote.id} issued to ${req.buyer}`
      : `${req.incoterm} quotation request ${quote.id} pending trade desk`,
    "Trade Desk",
  )
  return quote
}

export function adminSubmitQuote(id: string, data: {
  fobUnitPrice: number; freight: number; insurance: number; docFee: number; notes: string
}) {
  const idx = buyerQuotesCache.findIndex(q => q.id === id)
  if (idx === -1) return
  const valid = new Date(Date.now() + 7 * 86400000)
  buyerQuotesCache[idx] = {
    ...buyerQuotesCache[idx],
    ...data,
    status: "sent",
    source: "admin",
    validUntil: fmtDate(valid),
    date: fmtDate(new Date()),
  }
  buyerQuotesCache = [...buyerQuotesCache]

  const q = buyerQuotesCache[idx]
  if (q.rfqId && /^\d+$/.test(q.rfqId)) {
    void api.post(`/api/admin/rfqs/${q.rfqId}/quotations`, {
      qty_mt: q.qtyMT,
      incoterm: q.incoterm,
      destination: q.destination,
      payment_terms: q.paymentTerms,
      fob_unit_price: data.fobUnitPrice,
      freight: data.freight,
      insurance: data.insurance,
      doc_fee: data.docFee,
      notes: data.notes,
      send: true,
      valid_until: valid.toISOString().slice(0, 10),
    }).then(() => fetchQuotations()).catch(onFail(fetchQuotations))
  } else if (/^\d+$/.test(id)) {
    void api.post(`/api/admin/quotations/${id}/send`).then(() => fetchQuotations()).catch(onFail(fetchQuotations))
  }

  addAuditLog(`Quotation ${id} submitted to ${q.buyer}`, "Trade Desk")
}

export function setBuyerQuoteStatus(id: string, status: "accepted" | "rejected") {
  const idx = buyerQuotesCache.findIndex(q => q.id === id)
  if (idx === -1) return
  buyerQuotesCache[idx] = { ...buyerQuotesCache[idx], status }
  buyerQuotesCache = [...buyerQuotesCache]

  const path = status === "accepted"
    ? `/api/buyer/quotations/${id}/accept`
    : `/api/buyer/quotations/${id}/reject`
  void api.post(path).then(() => fetchQuotations()).catch(onFail(fetchQuotations))
  addAuditLog(`Quotation ${id} ${status}`, "Trade Desk")
}
