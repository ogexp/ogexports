import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { WithdrawalDetailDialog } from "@/components/admin/WithdrawalDetailDialog"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { DollarSign, ArrowDownCircle, ArrowUpCircle, CreditCard, CheckCircle2, XCircle, Landmark, Plus, Edit3, Trash2, Star, X, Copy, AlertCircle, Search, ChevronDown, Check, FileText, Eye } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import {
  getDeposits, getBuyerDeposits, getWithdrawals, getTransactions,
  approveDeposit, rejectDeposit, cancelDepositAsync as cancelDeposit,
  approveBuyerDeposit, rejectBuyerDeposit, cancelBuyerDeposit,
  approveWithdrawal, rejectWithdrawal,
  fetchFinance,
  getPlatformWalletStats,
  getFinanceStats,
  formatAdminMoney,
  formatAdminPct,
  type AdminDeposit, type AdminBuyerDeposit, type AdminWithdrawal, type AdminTransaction,
  type PlatformWalletStats,
  type FinanceOverviewStats,
} from "@/lib/admin-data"
import { getBankAccounts, refreshBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount, type BankAccount } from "@/lib/bank-accounts"
import { resolveMediaUrl } from "@/lib/api"
import { runAdminAction } from "@/lib/admin-actions"

const GOLD = "#D4A012"
const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

const TABS = [
  { id: "overview", label: "Overview", icon: DollarSign },
  { id: "buyer-deposits", label: "Buyer Deposits", icon: ArrowDownCircle },
  { id: "investor-deposits", label: "Investor Deposits", icon: ArrowDownCircle },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
  { id: "transactions", label: "All Transactions", icon: CreditCard },
  { id: "bank-accounts", label: "Bank Accounts", icon: Landmark },
]

const FINANCE_TAB_IDS = TABS.map(t => t.id)
const FINANCE_DATA_TABS = ["buyer-deposits", "investor-deposits", "withdrawals", "transactions"]

function resolveFinanceTab(investmentModuleEnabled: boolean): string {
  try {
    const tab = new URLSearchParams(window.location.search).get("tab") || "overview"
    const resolved = tab === "deposits" ? "buyer-deposits" : tab
    if (!investmentModuleEnabled && resolved === "investor-deposits") return "overview"
    if (FINANCE_TAB_IDS.includes(resolved)) return resolved
    return "overview"
  } catch {
    return "overview"
  }
}

function depositProofHref(deposit: AdminDeposit): string | undefined {
  if (deposit.proofUrl) return deposit.proofUrl
  if (deposit.proofPath) return resolveMediaUrl(deposit.proofPath)
  return undefined
}

function DepositProofCell({ deposit }: { deposit: AdminDeposit }) {
  const href = depositProofHref(deposit)
  if (!href) return <span className="text-muted-foreground">—</span>
  const isPdf = /\.pdf$/i.test(deposit.proofPath || deposit.proofUrl || "")
  if (isPdf) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
        <FileText className="w-3.5 h-3.5" /> View PDF
      </a>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title="View payment proof">
      <img src={href} alt="Payment proof" className="w-10 h-10 rounded object-cover border border-border hover:opacity-80 transition-opacity" />
    </a>
  )
}

const EMPTY_FORM: Partial<BankAccount> = {
  bankName: "", accountTitle: "", accountNumber: "",
  iban: "", swift: "", currency: "USD / PKR",
  isDefault: false, active: true, notes: "",
}

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#fffbeb", color: "#f59e0b" },
  approved: { bg: "#f0fdf4", color: GREEN },
  rejected: { bg: "#fef2f2", color: "#ef4444" },
  cancelled: { bg: "#f1f5f9", color: "#64748b" },
  completed: { bg: "#f0fdf4", color: GREEN },
  review: { bg: "#eff6ff", color: "#3b82f6" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { bg: "#f8fafc", color: "#64748b" }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ background: s.bg, color: s.color }}>{status}</span>
}

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm text-white ${type === "error" ? "bg-red-600" : "bg-gray-900"}`}>
      {type === "error" ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
      <span>{msg}</span>
      <button type="button" onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

const BANK_FIELDS = [
  { key: "bankName",      label: "Bank Name",         placeholder: "Select or search bank…",                 required: true  },
  { key: "accountTitle",  label: "Account Title",     placeholder: "e.g. OG Exports (Private) Limited",      required: true  },
  { key: "accountNumber", label: "Account Number",    placeholder: "e.g. 7234567890123456",                  required: true  },
  { key: "iban",          label: "IBAN",              placeholder: "e.g. PK36HABB0000020003891069",           required: false },
  { key: "swift",         label: "SWIFT / BIC",       placeholder: "e.g. HABBPKKA",                          required: false },
  { key: "currency",      label: "Currency / Label",  placeholder: "e.g. USD / PKR",                         required: false },
  { key: "notes",         label: "Notes (optional)",  placeholder: "e.g. Primary account for investor deposits", required: false },
]

const PAKISTAN_BANKS: { group: string; banks: string[] }[] = [
  {
    group: "Big Five Commercial Banks",
    banks: [
      "Habib Bank Limited (HBL)",
      "MCB Bank Limited",
      "United Bank Limited (UBL)",
      "Allied Bank Limited (ABL)",
      "National Bank of Pakistan (NBP)",
    ],
  },
  {
    group: "Major Private Banks",
    banks: [
      "Bank Alfalah Limited",
      "Faysal Bank Limited",
      "Askari Bank Limited",
      "JS Bank Limited",
      "Bank Al Habib Limited",
      "Habib Metropolitan Bank (HMB)",
      "Soneri Bank Limited",
      "Silk Bank Limited",
      "Summit Bank Limited",
    ],
  },
  {
    group: "Islamic Banks",
    banks: [
      "Meezan Bank Limited",
      "Al Baraka Bank Pakistan",
      "BankIslami Pakistan Limited",
      "Dubai Islamic Bank Pakistan",
      "MCB Islamic Bank",
    ],
  },
  {
    group: "Provincial / Government Banks",
    banks: [
      "Bank of Punjab (BOP)",
      "Bank of Khyber (BOK)",
      "Zarai Taraqiati Bank Limited (ZTBL)",
      "First Women Bank Limited (FWBL)",
      "Industrial Development Bank of Pakistan (IDBP)",
      "Punjab Provincial Cooperative Bank (PPCBL)",
      "SME Bank Limited",
    ],
  },
  {
    group: "Foreign Banks",
    banks: [
      "Standard Chartered Bank Pakistan",
      "SAMBA Bank Limited",
      "Citi Bank N.A. Pakistan",
      "Deutsche Bank Pakistan",
      "Industrial & Commercial Bank of China (ICBC) Pakistan",
    ],
  },
  {
    group: "Microfinance / Digital Banks",
    banks: [
      "Telenor Microfinance Bank (Easypaisa)",
      "Mobilink Microfinance Bank (JazzCash)",
      "U Microfinance Bank",
      "FINCA Microfinance Bank Pakistan",
      "Khushhali Microfinance Bank",
      "NRSP Microfinance Bank",
      "HBL Microfinance Bank",
      "Apna Microfinance Bank",
      "Advans Pakistan Microfinance Bank",
    ],
  },
  {
    group: "Investment / DFI",
    banks: [
      "Pak Kuwait Investment Company",
      "Pak Brunei Investment Company",
      "Pak China Investment Company",
      "Pak Libya Holding Company",
      "Pak Oman Investment Company",
      "Saudi Pak Industrial & Agricultural Investment Company",
    ],
  },
]

const ALL_PAKISTAN_BANKS = PAKISTAN_BANKS.flatMap(g => g.banks)

function BankAccountsPanel({ banks, onAdd, onEdit, onDelete, onToggleActive, onSetDefault, onCopy, EMERALD, GOLD, GREEN }: {
  banks: BankAccount[]
  onAdd: () => void
  onEdit: (b: BankAccount) => void
  onDelete: (id: string) => void
  onToggleActive: (b: BankAccount) => void
  onSetDefault: (b: BankAccount) => void
  onCopy: (text: string, label: string) => void
  EMERALD: string; GOLD: string; GREEN: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Deposit Bank Accounts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">These accounts are shown to investors when they make a deposit</p>
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: EMERALD }}>
          <Plus className="w-4 h-4" /> Add Bank Account
        </button>
      </div>

      {banks.length === 0 ? (
        <div className="py-16 text-center">
          <Landmark className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No bank accounts yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {banks.map(b => (
            <div key={b.id} className="rounded-xl border p-4 space-y-3"
              style={{ borderColor: b.isDefault ? GOLD + "60" : "rgba(0,0,0,0.08)", background: b.isDefault ? GOLD + "06" : "white", opacity: b.active ? 1 : 0.6 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: EMERALD + "15" }}>
                    <Landmark className="w-4 h-4" style={{ color: EMERALD }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight">{b.bankName}</div>
                    <div className="text-[11px] text-muted-foreground">{b.currency}</div>
                  </div>
                  {b.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: GOLD }}>DEFAULT</span>}
                  {!b.active && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-200 text-gray-500">INACTIVE</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(b)} title="Edit" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => onDelete(b.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                {([
                  { label: "Account Title", val: b.accountTitle },
                  { label: "Account No",    val: b.accountNumber },
                  { label: "IBAN",          val: b.iban },
                  { label: "SWIFT",         val: b.swift },
                ] as { label: string; val: string }[]).filter(r => r.val).map(r => (
                  <div key={r.label} className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground shrink-0 w-24">{r.label}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[11px] truncate">{r.val}</span>
                      <button onClick={() => onCopy(r.val, r.label)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {b.notes && <p className="text-[10px] text-muted-foreground pt-1 italic">{b.notes}</p>}
              </div>
              <div className="flex items-center gap-2 pt-1">
                {!b.isDefault && (
                  <button onClick={() => onSetDefault(b)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all hover:bg-amber-50 hover:border-amber-300"
                    style={{ borderColor: "rgba(0,0,0,0.12)", color: GOLD }}>
                    <Star className="w-3 h-3" /> Set Default
                  </button>
                )}
                <button onClick={() => onToggleActive(b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
                  style={{ borderColor: "rgba(0,0,0,0.1)", color: b.active ? "#ef4444" : GREEN }}>
                  {b.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminFinance() {
  const { investmentModuleEnabled } = usePlatformSettings()
  const visibleTabs = TABS.filter(t => investmentModuleEnabled || t.id !== "investor-deposits")
  const [activeTab, setActiveTab] = useState(() => resolveFinanceTab(investmentModuleEnabled))
  const [buyerDeposits, setBuyerDeposits] = useState<AdminBuyerDeposit[]>(() => getBuyerDeposits())
  const [deposits, setDeposits] = useState<AdminDeposit[]>(() => getDeposits())
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(() => getWithdrawals())
  const [transactions, setTransactions] = useState<AdminTransaction[]>(() => getTransactions())
  const [platformWallet, setPlatformWallet] = useState<PlatformWalletStats>(() => getPlatformWalletStats())
  const [financeStats, setFinanceStats] = useState<FinanceOverviewStats>(() => getFinanceStats())
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [withdrawDetail, setWithdrawDetail] = useState<AdminWithdrawal | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ── Bank Accounts state ──
  const [banks, setBanks] = useState<BankAccount[]>(() => getBankAccounts())
  const [bankModal, setBankModal] = useState<"add" | "edit" | null>(null)
  const [bankForm, setBankForm] = useState<Partial<BankAccount>>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bankNameSearch, setBankNameSearch] = useState("")
  const [bankDropOpen, setBankDropOpen] = useState(false)

  const refresh = async () => {
    await fetchFinance()
    setBuyerDeposits(getBuyerDeposits())
    setDeposits(getDeposits())
    setWithdrawals(getWithdrawals())
    setTransactions(getTransactions())
    setPlatformWallet(getPlatformWalletStats())
    setFinanceStats(getFinanceStats())
  }

  function selectTab(id: string) {
    setActiveTab(id)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", id)
    window.history.replaceState({}, "", url.toString())
  }

  useEffect(() => {
    if (!investmentModuleEnabled && activeTab === "investor-deposits") {
      selectTab("overview")
    }
  }, [investmentModuleEnabled, activeTab])

  useEffect(() => {
    const syncFromUrl = () => {
      const tab = resolveFinanceTab(investmentModuleEnabled)
      setActiveTab(prev => (prev !== tab ? tab : prev))
    }
    window.addEventListener("popstate", syncFromUrl)
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = (...args) => { origPush(...args); syncFromUrl() }
    history.replaceState = (...args) => { origReplace(...args); syncFromUrl() }
    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [investmentModuleEnabled])

  useEffect(() => {
    void fetchFinance().then(refresh)
  }, [])

  useEffect(() => {
    if (!FINANCE_DATA_TABS.includes(activeTab)) return
    void fetchFinance().then(refresh)
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "bank-accounts") return
    void refreshBankAccounts().then(refreshBanks)
  }, [activeTab])

  function refreshBanks() { setBanks(getBankAccounts()) }

  function openAdd() { setBankForm({ ...EMPTY_FORM }); setBankModal("add"); setBankNameSearch(""); setBankDropOpen(false) }
  function openEdit(b: BankAccount) { setBankForm({ ...b }); setBankModal("edit"); setBankNameSearch(""); setBankDropOpen(false) }

  function saveBank() {
    const f = bankForm
    if (!f.bankName?.trim() || !f.accountTitle?.trim() || !f.accountNumber?.trim()) {
      showToast("⚠ Bank name, account title and account number are required")
      return
    }
    if (bankModal === "add") {
      addBankAccount({ bankName: f.bankName!, accountTitle: f.accountTitle!, accountNumber: f.accountNumber!, iban: f.iban || "", swift: f.swift || "", currency: f.currency || "USD / PKR", isDefault: f.isDefault || false, active: f.active !== false, notes: f.notes || "" })
      showToast("✓ Bank account added")
    } else if (bankModal === "edit" && f.id) {
      updateBankAccount(f.id, f)
      showToast("✓ Bank account updated")
    }
    refreshBanks()
    setBankModal(null)
  }

  function confirmDelete(id: string) { setDeleteId(id) }
  function doDelete() {
    if (deleteId) { deleteBankAccount(deleteId); refreshBanks(); showToast("✓ Bank account deleted"); setDeleteId(null) }
  }

  function toggleActive(b: BankAccount) {
    updateBankAccount(b.id, { active: !b.active }); refreshBanks()
  }
  function setDefault(b: BankAccount) {
    updateBankAccount(b.id, { isDefault: true }); refreshBanks()
    showToast(`✓ ${b.bankName} set as default`)
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    showToast(`✓ ${label} copied`)
  }

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const runFinanceAction = async (key: string, action: () => Promise<void>, success: string) => {
    setActionLoading(key)
    await runAdminAction(action, {
      reload: refresh,
      successMessage: success,
      onSuccess: m => showToast(m || success, "success"),
      onError: m => showToast(m, "error"),
    })
    setActionLoading(null)
  }

  const handleApproveBuyerDeposit = (id: string, buyer: string, amount: string) => {
    void runFinanceAction(`bd-${id}`, async () => { await approveBuyerDeposit(id) }, `✓ Buyer deposit approved — ${buyer} ${amount}`)
  }
  const handleRejectBuyerDeposit = (id: string, buyer: string) => {
    void runFinanceAction(`bd-${id}`, async () => { await rejectBuyerDeposit(id) }, `✗ Buyer deposit rejected — ${buyer}`)
  }
  const handleCancelBuyerDeposit = (id: string, buyer: string) => {
    void runFinanceAction(`bd-${id}`, () => cancelBuyerDeposit(id), `Buyer deposit cancelled — ${buyer}`)
  }
  const handleApproveDeposit = (id: string, investor: string, amount: string) => {
    void runFinanceAction(`dep-${id}`, () => approveDeposit(id), `✓ Deposit ${id} approved — ${investor} ${amount}`)
  }
  const handleRejectDeposit = (id: string, investor: string) => {
    void runFinanceAction(`dep-${id}`, () => rejectDeposit(id), `✗ Deposit ${id} rejected — ${investor}`)
  }
  const handleCancelDeposit = (id: string, investor: string) => {
    void runFinanceAction(`dep-${id}`, () => cancelDeposit(id), `Deposit ${id} cancelled — ${investor}`)
  }
  const handleApproveWithdrawal = (id: string, investor: string, amount: string) => {
    void runFinanceAction(`wd-${id}`, () => approveWithdrawal(id), `✓ Withdrawal ${id} approved — ${investor} ${amount}`)
  }
  const handleRejectWithdrawal = (id: string, investor: string) => {
    void runFinanceAction(`wd-${id}`, () => rejectWithdrawal(id), `✗ Withdrawal ${id} rejected — ${investor}`)
  }

  const pendingBuyerDeposits = buyerDeposits.filter(d => d.status === "pending").length
  const pendingDeposits = deposits.filter(d => d.status === "pending").length
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending" || w.status === "review").length

  return (
    <AdminLayout title="Financial Management" subtitle="Revenue, deposits, withdrawals and transaction monitoring">
      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Monthly Revenue", value: formatAdminMoney(financeStats.monthlyRevenue), sub: `${formatAdminPct(financeStats.monthlyRevenueMomPct)} MoM`, icon: DollarSign, color: GREEN },
            { label: "Pending Reviews", value: String(pendingBuyerDeposits + pendingDeposits), sub: `${pendingBuyerDeposits} buyer · ${pendingDeposits} investor`, icon: ArrowDownCircle, color: "#3b82f6" },
            { label: `Total Withdrawals (${financeStats.monthLabel})`, value: formatAdminMoney(financeStats.monthlyWithdrawals), sub: `${pendingWithdrawals} pending`, icon: ArrowUpCircle, color: "#ef4444" },
            { label: "Platform Balance", value: formatAdminMoney(financeStats.platformBalance), sub: "Across all wallets", icon: CreditCard, color: GOLD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border">
          <div className="flex gap-1 p-4 border-b border-border overflow-x-auto">
            {visibleTabs.map(t => (
              <button key={t.id} onClick={() => selectTab(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "overview" && (
              <div className="space-y-5">
                {investmentModuleEnabled && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-emerald-50/50">
                      <div className="text-xl font-bold" style={{ color: EMERALD }}>
                        {platformWallet.currency} {platformWallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-medium mt-0.5">Platform Investment Pool</div>
                      <div className="text-[10px] text-muted-foreground">Wallet-funded investments held by admin</div>
                    </div>
                    <div className="p-4 rounded-xl border border-border">
                      <div className="text-xl font-bold" style={{ color: GREEN }}>
                        {platformWallet.currency} {platformWallet.activeInvestmentsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-medium mt-0.5">Active Investments</div>
                      <div className="text-[10px] text-muted-foreground">Principal currently deployed</div>
                    </div>
                    <div className="p-4 rounded-xl border border-border">
                      <div className="text-xl font-bold" style={{ color: GOLD }}>
                        {platformWallet.currency} {platformWallet.pendingReturnsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs font-medium mt-0.5">Est. Pending Returns</div>
                      <div className="text-[10px] text-muted-foreground">Principal + expected profit on active stakes</div>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold mb-1">Cash Flow Analytics</h3>
                  <p className="text-xs text-muted-foreground mb-4">Monthly deposits vs withdrawals vs profit</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={financeStats.cashflow.length ? financeStats.cashflow : [{ month: "—", deposits: 0, withdrawals: 0, profit: 0 }]} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                      <Bar dataKey="deposits" fill={GREEN} name="Deposits" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="withdrawals" fill="#ef4444" name="Withdrawals" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="profit" fill={GOLD} name="Profit" radius={[3, 3, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Total Investors", value: String(financeStats.totalInvestors || 0), sub: "Across all portfolios", color: EMERALD },
                    { label: "Avg. Portfolio", value: formatAdminMoney(financeStats.avgPortfolio, false), sub: "Per active investor", color: GREEN },
                    { label: "Cumulative Returns", value: formatAdminMoney(financeStats.cumulativeReturns, false), sub: "Paid out to date", color: GOLD },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-xl border border-border">
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs font-medium mt-0.5">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "buyer-deposits" && (
              <div>
                {pendingBuyerDeposits > 0 && (
                  <div className="mb-4 p-3 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-sm text-yellow-800 font-medium">{pendingBuyerDeposits} buyer deposit{pendingBuyerDeposits > 1 ? "s" : ""} pending approval</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Order", "Buyer", "Email", "Amount", "Method", "LC / Payment Details", "Reference", "Date", "Status", "Actions"].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {buyerDeposits.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No buyer payment submissions yet. When a buyer marks an order as paid on Trade Finance, it appears here.
                          </td>
                        </tr>
                      )}
                      {buyerDeposits.map(d => (
                        <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-3 text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{d.orderNumber}</td>
                          <td className="px-3 py-3 text-[12px] font-medium">{d.buyer}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{d.email}</td>
                          <td className="px-3 py-3 text-[12px] font-bold text-green-600">{d.amount}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{d.method}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground max-w-[220px]">
                            {d.field1Label || d.field1Value ? (
                              <div className="space-y-0.5">
                                {(d.field1Label || d.field1Value) && (
                                  <div><span className="font-semibold text-foreground/80">{d.field1Label || "Detail"}:</span> {d.field1Value || "—"}</div>
                                )}
                                {(d.field2Label || d.field2Value) && (
                                  <div><span className="font-semibold text-foreground/80">{d.field2Label || "Detail"}:</span> {d.field2Value || "—"}</div>
                                )}
                              </div>
                            ) : d.details}
                          </td>
                          <td className="px-3 py-3 text-[10px] font-mono text-muted-foreground">{d.ref || "—"}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{d.date}</td>
                          <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                          <td className="px-3 py-3">
                            {d.status === "pending" ? (
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => handleApproveBuyerDeposit(d.id, d.buyer, d.amount)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors"
                                  style={{ background: GREEN }}>
                                  <CheckCircle2 className="w-3 h-3" /> Approve
                                </button>
                                <button onClick={() => handleRejectBuyerDeposit(d.id, d.buyer)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white transition-colors">
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                                <button onClick={() => handleCancelBuyerDeposit(d.id, d.buyer)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-500 text-white transition-colors">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "investor-deposits" && (
              <div>
                {pendingDeposits > 0 && (
                  <div className="mb-4 p-3 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-sm text-yellow-800 font-medium">{pendingDeposits} investor deposit{pendingDeposits > 1 ? "s" : ""} pending approval</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Deposit ID", "Investor", "Email", "Amount", "Method", "Admin Account Info", "Bank Ref", "Proof", "Date", "Status", "Actions"].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.length === 0 && (
                        <tr>
                          <td colSpan={11} className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No investor deposits yet.
                          </td>
                        </tr>
                      )}
                      {deposits.map(d => (
                        <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-3 text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{d.id}</td>
                          <td className="px-3 py-3 text-[12px] font-medium">{d.investor}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{d.email}</td>
                          <td className="px-3 py-3 text-[12px] font-bold text-green-600">{d.amount}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{d.method}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">
                            {d.adminBankName || d.adminAccountNumber ? (
                              <div>
                                <div className="font-medium text-foreground">{d.adminBankName || "—"}</div>
                                {d.adminAccountNumber && (
                                  <div className="font-mono text-[10px]">{d.adminAccountNumber}</div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-3 text-[10px] font-mono text-muted-foreground">{d.bankRef || "—"}</td>
                          <td className="px-3 py-3"><DepositProofCell deposit={d} /></td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{d.date}</td>
                          <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                          <td className="px-3 py-3">
                            {d.status === "pending" ? (
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => handleApproveDeposit(d.id, d.investor, d.amount)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-colors"
                                  style={{ background: GREEN }}>
                                  <CheckCircle2 className="w-3 h-3" /> Approve
                                </button>
                                <button onClick={() => handleRejectDeposit(d.id, d.investor)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white transition-colors">
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                                <button onClick={() => handleCancelDeposit(d.id, d.investor)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-500 text-white transition-colors">
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "withdrawals" && (
              <div>
                {pendingWithdrawals > 0 && (
                  <div className="mb-4 p-3 rounded-xl border border-orange-200 bg-orange-50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-sm text-orange-800 font-medium">{pendingWithdrawals} withdrawal{pendingWithdrawals > 1 ? "s" : ""} pending approval</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Investor", "Amount", "Bank Details", "Withdrawal ID", "Reference", "Requested", "Status", "Actions"].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                            No withdrawal requests yet.
                          </td>
                        </tr>
                      )}
                      {withdrawals.map(w => {
                        const bd = w.bankDetails || {}
                        const bankDetailTitle = [
                          bd.account_holder && `Holder: ${bd.account_holder}`,
                          bd.account_number && `Account: ${bd.account_number}`,
                          bd.iban && `IBAN: ${bd.iban}`,
                          bd.swift && `SWIFT: ${bd.swift}`,
                          bd.branch && `Branch: ${bd.branch}`,
                        ].filter(Boolean).join("\n")
                        return (
                        <tr key={w.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-3 text-[12px] font-medium">{w.investor}</td>
                          <td className="px-3 py-3 text-[12px] font-bold text-red-600">{w.amount}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground" title={bankDetailTitle}>
                            <div className="font-medium text-foreground">{w.bank}</div>
                            {bd.account_holder && <div>{bd.account_holder}</div>}
                            {bd.account_number && <div className="font-mono text-[10px]">****{String(bd.account_number).slice(-4)}</div>}
                            {(bd.iban || bd.swift) && (
                              <div className="text-[10px]">{bd.iban || bd.swift}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[10px] font-mono font-semibold" style={{ color: EMERALD }}>{w.id}</td>
                          <td className="px-3 py-3 text-[10px] font-mono text-muted-foreground">{w.ref || "—"}</td>
                          <td className="px-3 py-3 text-[11px] text-muted-foreground">{w.requested}</td>
                          <td className="px-3 py-3"><StatusBadge status={w.status} /></td>
                          <td className="px-3 py-3">
                            {(w.status === "pending" || w.status === "review") ? (
                              <div className="flex gap-1 flex-wrap">
                                <button type="button" onClick={() => setWithdrawDetail(w)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted">
                                  <Eye className="w-3 h-3" /> Details
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading === `wd-${w.id}`}
                                  onClick={() => handleApproveWithdrawal(w.id, w.investor, w.amount)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50"
                                  style={{ background: GREEN }}>
                                  <CheckCircle2 className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoading === `wd-${w.id}`}
                                  onClick={() => handleRejectWithdrawal(w.id, w.investor)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500 text-white disabled:opacity-50">
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setWithdrawDetail(w)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted">
                                <Eye className="w-3 h-3" /> View Details
                              </button>
                            )}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Txn ID", "Type", "User", "Amount", "Date", "Method", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3 text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{t.id}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: t.type === "Deposit" ? "#f0fdf4" : t.type === "Withdrawal" ? "#fef2f2" : "#fefce8", color: t.type === "Deposit" ? GREEN : t.type === "Withdrawal" ? "#ef4444" : GOLD }}>{t.type}</span>
                        </td>
                        <td className="px-3 py-3 text-[12px] font-medium">{t.user}</td>
                        <td className="px-3 py-3 text-[12px] font-bold" style={{ color: t.amount.startsWith("+") ? GREEN : "#ef4444" }}>{t.amount}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{t.date}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{t.method}</td>
                        <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No transactions yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── BANK ACCOUNTS TAB ── */}
            {activeTab === "bank-accounts" && (
              <BankAccountsPanel
                banks={banks}
                onAdd={openAdd}
                onEdit={openEdit}
                onDelete={confirmDelete}
                onToggleActive={toggleActive}
                onSetDefault={setDefault}
                onCopy={copyText}
                EMERALD={EMERALD}
                GOLD={GOLD}
                GREEN={GREEN}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {bankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5" style={{ color: EMERALD }} />
                <h3 className="font-bold text-base">{bankModal === "add" ? "Add Bank Account" : "Edit Bank Account"}</h3>
              </div>
              <button onClick={() => setBankModal(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {BANK_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {field.label}{field.required ? <span className="text-red-500 ml-1">*</span> : null}
                  </label>

                  {field.key === "bankName" ? (
                    /* ── Searchable bank name dropdown ── */
                    <div className="relative">
                      {/* Trigger button */}
                      <button
                        type="button"
                        onClick={() => setBankDropOpen(v => !v)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-left bg-white hover:border-gray-400 focus:outline-none focus:border-emerald-600 transition-colors"
                      >
                        <span className={`flex-1 truncate ${bankForm.bankName ? "text-gray-900" : "text-gray-400"}`}>
                          {bankForm.bankName || "Select bank…"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${bankDropOpen ? "rotate-180" : ""}`} />
                      </button>

                      {bankDropOpen && (
                        <>
                          {/* Backdrop */}
                          <div className="fixed inset-0 z-40" onClick={() => setBankDropOpen(false)} />
                          {/* Dropdown panel */}
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-2xl">
                            {/* Search input at top */}
                            <div className="p-2.5 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                  autoFocus
                                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:border-emerald-600"
                                  placeholder="Search bank name…"
                                  value={bankNameSearch}
                                  onChange={e => setBankNameSearch(e.target.value)}
                                />
                              </div>
                            </div>
                            {/* Bank list */}
                            <div className="max-h-56 overflow-y-auto">
                              {(() => {
                                const q = bankNameSearch.toLowerCase()
                                const filtered = PAKISTAN_BANKS
                                  .map(g => ({ ...g, banks: g.banks.filter(b => b.toLowerCase().includes(q)) }))
                                  .filter(g => g.banks.length > 0)
                                if (filtered.length === 0) {
                                  return (
                                    <div className="px-3 py-3 text-sm text-gray-400 text-center">
                                      No match —{" "}
                                      <button
                                        type="button"
                                        className="text-emerald-700 font-semibold hover:underline"
                                        onMouseDown={e => { e.preventDefault(); setBankForm(f => ({ ...f, bankName: bankNameSearch })); setBankDropOpen(false); setBankNameSearch("") }}
                                      >
                                        use "{bankNameSearch}"
                                      </button>
                                    </div>
                                  )
                                }
                                return filtered.map(g => (
                                  <div key={g.group}>
                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 sticky top-0">
                                      {g.group}
                                    </div>
                                    {g.banks.map(bank => (
                                      <div
                                        key={bank}
                                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 transition-colors"
                                        onMouseDown={e => {
                                          e.preventDefault()
                                          setBankForm(f => ({ ...f, bankName: bank }))
                                          setBankDropOpen(false)
                                          setBankNameSearch("")
                                        }}
                                      >
                                        {bankForm.bankName === bank
                                          ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          : <span className="w-3.5 shrink-0" />
                                        }
                                        <span className={bankForm.bankName === bank ? "text-emerald-700 font-semibold" : ""}>{bank}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))
                              })()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-emerald-600"
                      placeholder={field.placeholder}
                      value={(bankForm as any)[field.key] || ""}
                      onChange={e => setBankForm(f => ({ ...f, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-amber-500"
                    checked={!!bankForm.isDefault}
                    onChange={e => setBankForm(f => ({ ...f, isDefault: e.target.checked }))} />
                  <span className="text-sm font-medium">Set as Default</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-emerald-600"
                    checked={bankForm.active !== false}
                    onChange={e => setBankForm(f => ({ ...f, active: e.target.checked }))} />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-border">
              <button onClick={() => setBankModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={saveBank}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: EMERALD }}>
                {bankModal === "add" ? "Add Account" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete Bank Account?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This will remove it from investor deposit instructions immediately.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={doDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <WithdrawalDetailDialog
        withdrawal={withdrawDetail}
        onClose={() => setWithdrawDetail(null)}
        onCopy={copyText}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
