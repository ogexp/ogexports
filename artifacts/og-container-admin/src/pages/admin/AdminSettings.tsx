import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Settings, Layout, Search, Globe, Bell, CreditCard, Save, CheckCircle2, Anchor, Plus, Edit3, Trash2, X, Package, Wallet, Key, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { getSettings, saveSettings, type AdminSettings } from "@/lib/admin-data"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { useLocalAuth } from "@/lib/local-auth"
import {
  getIncoterms,
  refreshIncoterms,
  addIncoterm,
  updateIncoterm,
  deleteIncoterm,
  type IncotermRow,
} from "@/lib/incoterms-admin"
import {
  getPaymentMethods,
  refreshPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethodRow,
} from "@/lib/payment-methods-admin"
import {
  getDepositOptions,
  refreshDepositOptions,
  addDepositOption,
  updateDepositOption,
  deleteDepositOption,
  PROJECT_TYPES,
  DASHBOARD_MODULES,
  type DepositOptionRow,
} from "@/lib/deposit-options-admin"
import SupplierSettingsTab from "@/components/admin/SupplierSettingsTab"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "cms", label: "CMS Content", icon: Layout },
  { id: "seo", label: "SEO Pages", icon: Search },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payment", label: "Payment Methods", icon: CreditCard },
  { id: "deposit_options", label: "Deposit Options", icon: Wallet },
  { id: "incoterms", label: "Incoterms", icon: Anchor },
  { id: "supplier_settings", label: "Supplier Settings", icon: Package },
  { id: "languages", label: "Languages", icon: Globe },
]

const EMPTY_INCOTERM: Partial<IncotermRow> = {
  code: "",
  label: "",
  sortOrder: 0,
  isActive: true,
}

const EMPTY_PAYMENT_METHOD: Partial<PaymentMethodRow> = {
  code: "",
  label: "",
  description: "",
  badge: "",
  fields: ["", ""],
  sortOrder: 0,
  isActive: true,
}

const EMPTY_DEPOSIT_OPTION: Partial<DepositOptionRow> = {
  title: "",
  type: "container",
  roiLabel: "",
  expectedReturnPct: 0,
  targetAmount: 0,
  raisedAmount: 0,
  minInvestment: 100,
  sortOrder: 0,
  dashboardModule: "",
  isActive: true,
}

const CMS_SECTIONS = [
  { id: "hero", title: "Homepage Hero", page: "Home", status: "published", lastEdit: "Jul 10, 2026" },
  { id: "about", title: "About Section", page: "Home", status: "published", lastEdit: "Jul 5, 2026" },
  { id: "products", title: "Products Overview", page: "Home", status: "published", lastEdit: "Jul 3, 2026" },
  { id: "investment", title: "Investment Section", page: "Investment", status: "published", lastEdit: "Jun 28, 2026" },
  { id: "company", title: "Company Profile", page: "Company", status: "draft", lastEdit: "Jul 8, 2026" },
  { id: "blog1", title: "Pakistan's Rice Export Boom", page: "Blog", status: "published", lastEdit: "Jul 1, 2026" },
  { id: "blog2", title: "Mango Season 2026 Outlook", page: "Blog", status: "draft", lastEdit: "Jul 11, 2026" },
]

const SEO_PAGES = [
  { page: "Home", title: "OG Exports — Premium Pakistani Agricultural Exports", desc: "Pakistan's leading agricultural export platform. Source premium rice, mangoes, kinnow, dates and more.", status: "optimized" },
  { page: "Products", title: "Agricultural Products — Rice, Fruits, Vegetables | OG Exports", desc: "Browse our complete range of premium Pakistani agricultural products available for export worldwide.", status: "optimized" },
  { page: "Investment", title: "Investment Platform — Profit Sharing Returns | OG Exports", desc: "Invest in agricultural export shipments and earn competitive profit-sharing returns.", status: "needs-update" },
  { page: "About", title: "About OG Exports — Pakistan's Trade Platform", desc: "Learn about OG Exports, our mission and our commitment to quality agricultural trade.", status: "optimized" },
]

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧", status: "complete", coverage: 100 },
  { code: "ar", name: "Arabic", flag: "🇸🇦", status: "complete", coverage: 94 },
  { code: "zh", name: "Chinese (Simplified)", flag: "🇨🇳", status: "partial", coverage: 72 },
  { code: "ur", name: "Urdu", flag: "🇵🇰", status: "complete", coverage: 98 },
  { code: "ru", name: "Russian", flag: "🇷🇺", status: "partial", coverage: 65 },
  { code: "tr", name: "Turkish", flag: "🇹🇷", status: "partial", coverage: 58 },
]

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm">
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative w-10 h-5 rounded-full transition-colors shrink-0" style={{ background: checked ? GREEN : "#cbd5e1" }}>
      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: checked ? "calc(100% - 18px)" : "2px" }} />
    </button>
  )
}

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const { supplierModuleEnabled } = usePlatformSettings()
  const { changePassword } = useLocalAuth()
  const [activeTab, setActiveTab] = useState("general")
  const [settings, setSettings] = useState<AdminSettings>(() => getSettings())
  const [toast, setToast] = useState("")
  const [cmsStatus, setCmsStatus] = useState<Record<string, string>>({})
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState("")
  const [showPass, setShowPass] = useState(false)
  const visibleTabs = TABS.filter(t => supplierModuleEnabled || t.id !== "supplier_settings")

  useEffect(() => {
    if (!supplierModuleEnabled && activeTab === "supplier_settings") {
      setActiveTab("general")
    }
  }, [supplierModuleEnabled, activeTab])

  const [incoterms, setIncoterms] = useState<IncotermRow[]>(() => getIncoterms())
  const [incotermModal, setIncotermModal] = useState<"add" | "edit" | null>(null)
  const [incotermForm, setIncotermForm] = useState<Partial<IncotermRow>>(EMPTY_INCOTERM)
  const [deleteIncotermId, setDeleteIncotermId] = useState<string | null>(null)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>(() => getPaymentMethods())
  const [paymentModal, setPaymentModal] = useState<"add" | "edit" | null>(null)
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentMethodRow>>(EMPTY_PAYMENT_METHOD)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)

  const [depositOptions, setDepositOptions] = useState<DepositOptionRow[]>(() => getDepositOptions())
  const [depositModal, setDepositModal] = useState<"add" | "edit" | null>(null)
  const [depositForm, setDepositForm] = useState<Partial<DepositOptionRow>>(EMPTY_DEPOSIT_OPTION)
  const [deleteDepositId, setDeleteDepositId] = useState<string | null>(null)

  useEffect(() => {
    void refreshIncoterms().then(() => setIncoterms(getIncoterms()))
    void refreshPaymentMethods().then(() => setPaymentMethods(getPaymentMethods()))
    void refreshDepositOptions().then(() => setDepositOptions(getDepositOptions()))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const refreshIncotermList = () => setIncoterms(getIncoterms())
  const refreshPaymentList = () => setPaymentMethods(getPaymentMethods())
  const refreshDepositList = () => setDepositOptions(getDepositOptions())

  const openAddIncoterm = () => {
    setIncotermForm({ ...EMPTY_INCOTERM, sortOrder: (incoterms.length + 1) * 1 })
    setIncotermModal("add")
  }

  const openEditIncoterm = (row: IncotermRow) => {
    setIncotermForm({ ...row })
    setIncotermModal("edit")
  }

  const saveIncotermForm = () => {
    const code = (incotermForm.code || "").trim().toUpperCase()
    if (!code) {
      showToast("⚠ Incoterm code is required")
      return
    }
    if (incotermModal === "add") {
      addIncoterm({
        code,
        label: (incotermForm.label || "").trim(),
        sortOrder: Number(incotermForm.sortOrder ?? 0),
        isActive: incotermForm.isActive !== false,
      })
      showToast("✓ Incoterm added")
    } else if (incotermModal === "edit" && incotermForm.id) {
      updateIncoterm(incotermForm.id, {
        code,
        label: (incotermForm.label || "").trim(),
        sortOrder: Number(incotermForm.sortOrder ?? 0),
        isActive: incotermForm.isActive !== false,
      })
      showToast("✓ Incoterm updated")
    }
    refreshIncotermList()
    setIncotermModal(null)
  }

  const doDeleteIncoterm = () => {
    if (!deleteIncotermId) return
    deleteIncoterm(deleteIncotermId)
    refreshIncotermList()
    showToast("✓ Incoterm deleted")
    setDeleteIncotermId(null)
  }

  const openAddPayment = () => {
    setPaymentForm({ ...EMPTY_PAYMENT_METHOD, fields: ["", ""], sortOrder: (paymentMethods.length + 1) * 1 })
    setPaymentModal("add")
  }

  const openEditPayment = (row: PaymentMethodRow) => {
    setPaymentForm({
      ...row,
      fields: [row.fields[0] || "", row.fields[1] || ""],
    })
    setPaymentModal("edit")
  }

  const savePaymentForm = () => {
    const code = (paymentForm.code || "").trim().toLowerCase()
    const label = (paymentForm.label || "").trim()
    if (!code) {
      showToast("⚠ Payment method code is required")
      return
    }
    if (!label) {
      showToast("⚠ Payment method label is required")
      return
    }
    const fields = [
      (paymentForm.fields?.[0] || "").trim(),
      (paymentForm.fields?.[1] || "").trim(),
    ].filter(Boolean)
    const payload = {
      code,
      label,
      description: (paymentForm.description || "").trim(),
      badge: (paymentForm.badge || "").trim(),
      fields,
      sortOrder: Number(paymentForm.sortOrder ?? 0),
      isActive: paymentForm.isActive !== false,
    }
    if (paymentModal === "add") {
      addPaymentMethod(payload)
      showToast("✓ Payment method added")
    } else if (paymentModal === "edit" && paymentForm.id) {
      updatePaymentMethod(paymentForm.id, payload)
      showToast("✓ Payment method updated")
    }
    refreshPaymentList()
    setPaymentModal(null)
  }

  const doDeletePayment = () => {
    if (!deletePaymentId) return
    deletePaymentMethod(deletePaymentId)
    refreshPaymentList()
    showToast("✓ Payment method deleted")
    setDeletePaymentId(null)
  }

  const openAddDeposit = () => {
    setDepositForm({ ...EMPTY_DEPOSIT_OPTION, sortOrder: (depositOptions.length + 1) * 1 })
    setDepositModal("add")
  }

  const openEditDeposit = (row: DepositOptionRow) => {
    setDepositForm({ ...row })
    setDepositModal("edit")
  }

  const saveDepositForm = () => {
    const title = (depositForm.title || "").trim()
    if (!title) {
      showToast("⚠ Title is required")
      return
    }
    const payload = {
      title,
      type: depositForm.type || "container",
      roiLabel: (depositForm.roiLabel || "").trim(),
      expectedReturnPct: Number(depositForm.expectedReturnPct ?? 0),
      targetAmount: Number(depositForm.targetAmount ?? 0),
      raisedAmount: Number(depositForm.raisedAmount ?? 0),
      minInvestment: Number(depositForm.minInvestment ?? 100),
      sortOrder: Number(depositForm.sortOrder ?? 0),
      dashboardModule: depositForm.dashboardModule || "",
      isActive: depositForm.isActive !== false,
    }
    if (depositModal === "add") {
      addDepositOption(payload)
      showToast("✓ Deposit option added")
    } else if (depositModal === "edit" && depositForm.id) {
      updateDepositOption(depositForm.id, payload)
      showToast("✓ Deposit option updated")
    }
    setTimeout(() => refreshDepositList(), 400)
    setDepositModal(null)
  }

  const doDeleteDeposit = () => {
    if (!deleteDepositId) return
    deleteDepositOption(deleteDepositId)
    refreshDepositList()
    showToast("✓ Deposit option deleted")
    setDeleteDepositId(null)
  }

  const handleSave = () => {
    saveSettings(settings)
    void queryClient.invalidateQueries({ queryKey: ["platform-settings"] })
    showToast("✓ Settings saved successfully")
  }

  const handlePasswordUpdate = async () => {
    setPwError("")
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Passwords do not match.")
      showToast("Passwords do not match")
      return
    }
    if (pwForm.next.length < 8) {
      setPwError("Password must be at least 8 characters.")
      showToast("Password must be at least 8 characters")
      return
    }
    setPwSaving(true)
    const res = await changePassword(pwForm.current, pwForm.next)
    setPwSaving(false)
    if (res.success) {
      setPwForm({ current: "", next: "", confirm: "" })
      showToast("✓ Password updated successfully")
    } else {
      setPwError(res.error || "Unable to update password")
      showToast(res.error || "Unable to update password")
    }
  }

  const updateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
  }

  const updateNotification = (key: keyof AdminSettings["notifications"], value: boolean) => {
    setSettings(s => ({ ...s, notifications: { ...s.notifications, [key]: value } }))
  }

  return (
    <AdminLayout title="System Settings" subtitle="Platform configuration, CMS, SEO and payment management">
      <div className="p-6 space-y-5">
        <div className="bg-white rounded-xl border border-border">
          <div className="flex gap-1 p-4 border-b border-border overflow-x-auto">
            {visibleTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* General */}
            {activeTab === "general" && (
              <div className="space-y-5 max-w-2xl">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Site Name</label>
                    <input value={settings.siteName} onChange={e => updateSetting("siteName", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Tagline</label>
                    <input value={settings.tagline} onChange={e => updateSetting("tagline", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Support Email</label>
                    <input value={settings.supportEmail} onChange={e => updateSetting("supportEmail", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">WhatsApp Number</label>
                    <input value={settings.whatsapp} onChange={e => updateSetting("whatsapp", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Default Currency</label>
                    <select value={settings.currency} onChange={e => updateSetting("currency", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none bg-background">
                      {["USD", "EUR", "GBP", "AED", "SAR", "PKR"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Min Investment ($)</label>
                    <input type="number" value={settings.minInvestment} onChange={e => updateSetting("minInvestment", Number(e.target.value))} className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold">Platform Controls</h3>
                  {[
                    { label: "Maintenance Mode", sub: "Show maintenance page to all visitors", key: "maintenanceMode" as const },
                    { label: "Open Registration", sub: "Allow new users to register", key: "registrationOpen" as const },
                    { label: "KYC Required", sub: "Require KYC verification before trading", key: "kycRequired" as const },
                    { label: "Investment Open", sub: "Accept new investment applications", key: "investmentOpen" as const },
                    { label: "Show Investment Module", sub: "Allow investor registration, login, and admin investment tools", key: "investmentModuleEnabled" as const },
                    { label: "Show Supplier Module", sub: "Allow supplier registration, login, and admin supplier tools", key: "supplierModuleEnabled" as const },
                    { label: "Admin OTP Login", sub: "Require email OTP after password before admin can sign in", key: "adminOtpEnabled" as const },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                      </div>
                      <ToggleSwitch checked={settings[item.key] as boolean} onChange={v => updateSetting(item.key, v)} />
                    </div>
                  ))}
                </div>

                <div className="border border-border rounded-xl p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" /> Account Security
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Update the password for your signed-in admin account</p>
                  </div>
                  {pwError && (
                    <div className="text-xs text-red-500">{pwError}</div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          placeholder="Enter current password"
                          value={pwForm.current}
                          onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                          className="w-full border border-border rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:border-primary"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">New Password</label>
                      <input
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={pwForm.next}
                        onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handlePasswordUpdate()}
                    disabled={pwSaving || !pwForm.current || !pwForm.next}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-60"
                  >
                    {pwSaving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                      : <><Key className="w-4 h-4" /> Update Password</>}
                  </button>
                </div>

                {settings.investmentModuleEnabled && (
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold">Investor Currency Display</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Control how Pakistani investors see money amounts across the investor portal and admin views.
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium">Show amounts in PKR for Pakistani investors</div>
                        <div className="text-[11px] text-muted-foreground">
                          Off: all investors see USD only.
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.investPkrDisplayEnabled !== false}
                        onChange={v => updateSetting("investPkrDisplayEnabled", v)}
                      />
                    </div>
                    {settings.investPkrDisplayEnabled !== false ? (
                      <div className="space-y-2 pt-1 border-t border-border">
                        <div className="text-xs font-semibold text-muted-foreground uppercase">
                          Pakistani display mode
                        </div>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="invest-pkr-display-mode"
                            className="mt-1"
                            checked={settings.investDualCurrencyEnabled === false}
                            onChange={() => updateSetting("investDualCurrencyEnabled", false)}
                          />
                          <span>
                            <span className="text-sm font-medium block">PKR only</span>
                            <span className="text-[11px] text-muted-foreground">PKR 1,000.00</span>
                          </span>
                        </label>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="invest-pkr-display-mode"
                            className="mt-1"
                            checked={settings.investDualCurrencyEnabled === true}
                            onChange={() => updateSetting("investDualCurrencyEnabled", true)}
                          />
                          <span>
                            <span className="text-sm font-medium block">PKR and USD</span>
                            <span className="text-[11px] text-muted-foreground">PKR 1,000.00 ($10.00)</span>
                          </span>
                        </label>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
                        All investors (Pakistani and international) see amounts in USD only.
                      </p>
                    )}
                  </div>
                )}

                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold">Supplier Currency Display</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Control how Pakistani suppliers see offer and dashboard amounts (PKR only or USD only).
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">Show amounts in PKR for Pakistani suppliers</div>
                      <div className="text-[11px] text-muted-foreground">
                        Off: Pakistani suppliers see USD only. Default: PKR.
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.supplierPkrDisplayEnabled !== false}
                      onChange={v => updateSetting("supplierPkrDisplayEnabled", v)}
                    />
                  </div>
                </div>

                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold">Buyer Currency Display</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Control how Pakistani buyers see order and dashboard amounts (PKR only or USD only).
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">Show amounts in PKR for Pakistani buyers</div>
                      <div className="text-[11px] text-muted-foreground">
                        Off: Pakistani buyers see USD only. Default: PKR.
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.buyerPkrDisplayEnabled !== false}
                      onChange={v => updateSetting("buyerPkrDisplayEnabled", v)}
                    />
                  </div>
                </div>

                {settings.investmentModuleEnabled && (
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold">Investment Categories Visibility</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Control which investment categories appear in the investor sidebar, investor dashboard, admin left menu, and Investments tabs. Hidden by default.
                    </p>
                    {[
                      { label: "Show Fresh Produce", sub: "Show Fresh Produce in investor and admin investment UIs", key: "investProduceVisible" as const },
                      { label: "Show Processing Plant", sub: "Show Processing Plant in investor and admin investment UIs", key: "investPlantVisible" as const },
                      { label: "Show Feeds", sub: "Show Feed Mill in investor and admin investment UIs", key: "investFeedsVisible" as const },
                      { label: "Show Rice Mill", sub: "Show Rice Mill in investor and admin investment UIs", key: "investRicemillVisible" as const },
                      { label: "Show Yellow Maize", sub: "Show Yellow Maize card on investor dashboard", key: "investYellowMaizeVisible" as const },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                        </div>
                        <ToggleSwitch checked={settings[item.key] as boolean} onChange={v => updateSetting(item.key, v)} />
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: EMERALD }}>
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            )}

            {/* CMS */}
            {activeTab === "cms" && (
              <div className="space-y-3">
                {CMS_SECTIONS.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/20 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: s.status === "published" ? "#f0fdf4" : "#fffbeb", color: s.status === "published" ? GREEN : "#f59e0b" }}>
                          {s.status === "published" ? "PUBLISHED" : "DRAFT"}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">Page: {s.page} · Last edited: {cmsStatus[s.id] || s.lastEdit}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setCmsStatus(prev => ({ ...prev, [s.id]: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) })); showToast(`${s.title} saved`) }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted transition-colors">Edit</button>
                      <button onClick={() => showToast(`${s.title} ${s.status === "published" ? "unpublished" : "published"}`)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors"
                        style={{ background: s.status === "published" ? "#f59e0b" : GREEN }}>
                        {s.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SEO */}
            {activeTab === "seo" && (
              <div className="space-y-4">
                {SEO_PAGES.map(p => (
                  <div key={p.page} className="border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.page}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: p.status === "optimized" ? "#f0fdf4" : "#fffbeb", color: p.status === "optimized" ? GREEN : "#f59e0b" }}>
                          {p.status === "optimized" ? "Optimized" : "Needs Update"}
                        </span>
                      </div>
                      <button onClick={() => showToast(`${p.page} SEO settings saved`)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: EMERALD }}>
                        <Save className="w-3 h-3 inline mr-1" />Save
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Meta Title</label>
                        <input defaultValue={p.title} className="w-full border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Meta Description</label>
                        <textarea defaultValue={p.desc} rows={2} className="w-full border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none resize-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <div className="space-y-4 max-w-lg">
                <div className="border border-border rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold">Email Notifications</h3>
                  {[
                    { label: "New Order Received", sub: "Send email when a new order is placed", key: "emailOnOrder" as const },
                    { label: "Deposit Received", sub: "Send email when an investor makes a deposit", key: "emailOnDeposit" as const },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                      </div>
                      <ToggleSwitch checked={settings.notifications[item.key]} onChange={v => updateNotification(item.key, v)} />
                    </div>
                  ))}
                </div>
                <div className="border border-border rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold">SMS & WhatsApp</h3>
                  {[
                    { label: "SMS on KYC Update", sub: "Send SMS when KYC status changes", key: "smsOnKYC" as const },
                    { label: "WhatsApp Alerts", sub: "Send WhatsApp for critical alerts", key: "whatsappAlerts" as const },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                      </div>
                      <ToggleSwitch checked={settings.notifications[item.key]} onChange={v => updateNotification(item.key, v)} />
                    </div>
                  ))}
                </div>
                <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: EMERALD }}>
                  <Save className="w-4 h-4" /> Save Notification Settings
                </button>
              </div>
            )}

            {/* Payment Methods */}
            {activeTab === "payment" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold">Payment Methods</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage methods shown in checkout and Trade Finance. Only active methods appear on the frontend.</p>
                  </div>
                  <button onClick={openAddPayment}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: EMERALD }}>
                    <Plus className="w-4 h-4" /> Add Payment Method
                  </button>
                </div>

                {paymentMethods.length === 0 ? (
                  <div className="py-16 text-center">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No payment methods yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-semibold">Code</th>
                          <th className="px-4 py-3 font-semibold">Label</th>
                          <th className="px-4 py-3 font-semibold">Badge</th>
                          <th className="px-4 py-3 font-semibold">Sort</th>
                          <th className="px-4 py-3 font-semibold">Active</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentMethods.map(row => (
                          <tr key={row.id} className="border-t border-border hover:bg-muted/20" style={{ opacity: row.isActive ? 1 : 0.65 }}>
                            <td className="px-4 py-3 font-mono font-bold text-sm">{row.code}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium">{row.label}</div>
                              {row.description && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{row.description}</div>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{row.badge || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.sortOrder}</td>
                            <td className="px-4 py-3">
                              <ToggleSwitch
                                checked={row.isActive}
                                onChange={v => {
                                  updatePaymentMethod(row.id, { isActive: v })
                                  refreshPaymentList()
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditPayment(row)} title="Edit" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setDeletePaymentId(row.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Deposit Options */}
            {activeTab === "deposit_options" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold">Deposit Invest-In Options</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage projects shown in the investor deposit &quot;Invest In&quot; dropdown. Disabled options stay in admin but are hidden from investors.
                    </p>
                  </div>
                  <button onClick={openAddDeposit}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: EMERALD }}>
                    <Plus className="w-4 h-4" /> Add Option
                  </button>
                </div>

                {depositOptions.length === 0 ? (
                  <div className="py-16 text-center">
                    <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No deposit options yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-semibold">Title</th>
                          <th className="px-4 py-3 font-semibold">ROI</th>
                          <th className="px-4 py-3 font-semibold">Target</th>
                          <th className="px-4 py-3 font-semibold">Raised</th>
                          <th className="px-4 py-3 font-semibold">Module</th>
                          <th className="px-4 py-3 font-semibold">Sort</th>
                          <th className="px-4 py-3 font-semibold">Active</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {depositOptions.map(row => (
                          <tr key={row.id} className="border-t border-border hover:bg-muted/20" style={{ opacity: row.isActive ? 1 : 0.65 }}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{row.title}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">{row.type}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{row.roiLabel || `${row.expectedReturnPct}%`}</td>
                            <td className="px-4 py-3 text-muted-foreground">${Number(row.targetAmount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-muted-foreground">${Number(row.raisedAmount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.dashboardModule || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.sortOrder}</td>
                            <td className="px-4 py-3">
                              <ToggleSwitch
                                checked={row.isActive}
                                onChange={v => {
                                  updateDepositOption(row.id, { isActive: v })
                                  setTimeout(() => refreshDepositList(), 400)
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditDeposit(row)} title="Edit" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setDeleteDepositId(row.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Incoterms */}
            {activeTab === "incoterms" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold">Incoterm Values</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage trade terms shown in RFQ, checkout, and quotation flows</p>
                  </div>
                  <button onClick={openAddIncoterm}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: EMERALD }}>
                    <Plus className="w-4 h-4" /> Add Incoterm
                  </button>
                </div>

                {incoterms.length === 0 ? (
                  <div className="py-16 text-center">
                    <Anchor className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No Incoterms yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-semibold">Code</th>
                          <th className="px-4 py-3 font-semibold">Label</th>
                          <th className="px-4 py-3 font-semibold">Sort</th>
                          <th className="px-4 py-3 font-semibold">Active</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incoterms.map(row => (
                          <tr key={row.id} className="border-t border-border hover:bg-muted/20" style={{ opacity: row.isActive ? 1 : 0.65 }}>
                            <td className="px-4 py-3 font-mono font-bold text-sm">{row.code}</td>
                            <td className="px-4 py-3">{row.label || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.sortOrder}</td>
                            <td className="px-4 py-3">
                              <ToggleSwitch
                                checked={row.isActive}
                                onChange={v => {
                                  updateIncoterm(row.id, { isActive: v })
                                  refreshIncotermList()
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditIncoterm(row)} title="Edit" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setDeleteIncotermId(row.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Supplier Settings */}
            {supplierModuleEnabled && activeTab === "supplier_settings" && (
              <SupplierSettingsTab onToast={showToast} />
            )}

            {/* Languages */}
            {activeTab === "languages" && (
              <div className="space-y-3">
                {LANGUAGES.map(l => (
                  <div key={l.code} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{l.flag}</span>
                      <div>
                        <div className="font-semibold text-sm">{l.name}</div>
                        <div className="text-[11px] text-muted-foreground">{l.coverage}% coverage</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${l.coverage}%`, background: l.coverage >= 90 ? GREEN : l.coverage >= 70 ? GOLD : "#94a3b8" }} />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: l.status === "complete" ? "#f0fdf4" : "#fffbeb", color: l.status === "complete" ? GREEN : "#f59e0b" }}>
                        {l.status === "complete" ? "Complete" : "Partial"}
                      </span>
                      <button onClick={() => showToast(`${l.name} translation update initiated`)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted transition-colors">Update</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {incotermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Anchor className="w-5 h-5" style={{ color: EMERALD }} />
                <h3 className="font-bold text-base">{incotermModal === "add" ? "Add Incoterm" : "Edit Incoterm"}</h3>
              </div>
              <button onClick={() => setIncotermModal(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  value={incotermForm.code || ""}
                  onChange={e => setIncotermForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  maxLength={10}
                  placeholder="e.g. FOB"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Label</label>
                <input
                  value={incotermForm.label || ""}
                  onChange={e => setIncotermForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Free On Board"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={incotermForm.sortOrder ?? 0}
                  onChange={e => setIncotermForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">Active</span>
                <ToggleSwitch
                  checked={incotermForm.isActive !== false}
                  onChange={v => setIncotermForm(f => ({ ...f, isActive: v }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setIncotermModal(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={saveIncotermForm} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: EMERALD }}>
                {incotermModal === "add" ? "Add Incoterm" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" style={{ color: EMERALD }} />
                <h3 className="font-bold text-base">{paymentModal === "add" ? "Add Payment Method" : "Edit Payment Method"}</h3>
              </div>
              <button onClick={() => setPaymentModal(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  value={paymentForm.code || ""}
                  onChange={e => setPaymentForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "") }))}
                  maxLength={50}
                  placeholder="e.g. lc"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  value={paymentForm.label || ""}
                  onChange={e => setPaymentForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Letter of Credit (LC at Sight)"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Description</label>
                <textarea
                  value={paymentForm.description || ""}
                  onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Shown under the method title on checkout"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Badge</label>
                <input
                  value={paymentForm.badge || ""}
                  onChange={e => setPaymentForm(f => ({ ...f, badge: e.target.value }))}
                  placeholder="e.g. Most Common"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Field 1 (required on frontend)</label>
                <input
                  value={paymentForm.fields?.[0] || ""}
                  onChange={e => setPaymentForm(f => ({ ...f, fields: [e.target.value, f.fields?.[1] || ""] }))}
                  placeholder="e.g. LC Issuing Bank Name"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Field 2 (optional)</label>
                <input
                  value={paymentForm.fields?.[1] || ""}
                  onChange={e => setPaymentForm(f => ({ ...f, fields: [f.fields?.[0] || "", e.target.value] }))}
                  placeholder="e.g. LC Draft Number (optional)"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={paymentForm.sortOrder ?? 0}
                  onChange={e => setPaymentForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">Active</span>
                <ToggleSwitch
                  checked={paymentForm.isActive !== false}
                  onChange={v => setPaymentForm(f => ({ ...f, isActive: v }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-white">
              <button onClick={() => setPaymentModal(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={savePaymentForm} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: EMERALD }}>
                {paymentModal === "add" ? "Add Payment Method" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteIncotermId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-base">Delete Incoterm?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove <span className="font-mono font-semibold text-foreground">{incoterms.find(r => r.id === deleteIncotermId)?.code}</span> from the list. Existing orders keep their stored code.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteIncotermId(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={doDeleteIncoterm} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-base">Delete Payment Method?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove <span className="font-mono font-semibold text-foreground">{paymentMethods.find(r => r.id === deletePaymentId)?.code}</span> from the list. Existing orders keep their stored payment method label.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeletePaymentId(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={doDeletePayment} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {depositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" style={{ color: EMERALD }} />
                <h3 className="font-bold text-base">{depositModal === "add" ? "Add Deposit Option" : "Edit Deposit Option"}</h3>
              </div>
              <button onClick={() => setDepositModal(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={depositForm.title || ""}
                  onChange={e => setDepositForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Feed Mill"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Project Type</label>
                  <select
                    value={depositForm.type || "container"}
                    onChange={e => setDepositForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none bg-background"
                  >
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Dashboard Module</label>
                  <select
                    value={depositForm.dashboardModule || ""}
                    onChange={e => setDepositForm(f => ({ ...f, dashboardModule: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none bg-background"
                  >
                    {DASHBOARD_MODULES.map(t => <option key={t.value || "none"} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">ROI Label</label>
                  <input
                    value={depositForm.roiLabel || ""}
                    onChange={e => setDepositForm(f => ({ ...f, roiLabel: e.target.value }))}
                    placeholder="e.g. 18% annual"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Expected ROI %</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={depositForm.expectedReturnPct ?? 0}
                    onChange={e => setDepositForm(f => ({ ...f, expectedReturnPct: Number(e.target.value) }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Target Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositForm.targetAmount ?? 0}
                    onChange={e => setDepositForm(f => ({ ...f, targetAmount: Number(e.target.value) }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Raised Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositForm.raisedAmount ?? 0}
                    onChange={e => setDepositForm(f => ({ ...f, raisedAmount: Number(e.target.value) }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Min Investment ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositForm.minInvestment ?? 100}
                    onChange={e => setDepositForm(f => ({ ...f, minInvestment: Number(e.target.value) }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={depositForm.sortOrder ?? 0}
                    onChange={e => setDepositForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">Active</span>
                <ToggleSwitch
                  checked={depositForm.isActive !== false}
                  onChange={v => setDepositForm(f => ({ ...f, isActive: v }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-border sticky bottom-0 bg-white">
              <button onClick={() => setDepositModal(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={saveDepositForm} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: EMERALD }}>
                {depositModal === "add" ? "Add Option" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDepositId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-base">Delete Deposit Option?</h3>
            <p className="text-sm text-muted-foreground">
              This will remove <span className="font-semibold text-foreground">{depositOptions.find(r => r.id === deleteDepositId)?.title}</span> from the deposit dropdown. Linked deposits/investments keep the project record.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteDepositId(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={doDeleteDeposit} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </AdminLayout>
  )
}
