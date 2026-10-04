import { useState, useEffect, useCallback } from "react"
import { useLocation, useSearch } from "wouter"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { BuyersTab, InvestorsTab, SuppliersTab } from "@/components/admin/AdminUsersTabs"
import { Users, TrendingUp, Building2, UserCog, Shield, CheckCircle2, XCircle } from "lucide-react"
import { getUsers, fetchUsersPaginated } from "@/lib/admin-data"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm text-white animate-in slide-in-from-bottom-2 ${type === "error" ? "bg-red-600" : "bg-gray-900"}`}>
      {type === "error" ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
      <span>{msg}</span>
      <button type="button" onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

const ROLES = [
  { role: "Super Admin", description: "Full platform access", users: 1, permissions: "All modules — unrestricted", color: "#ef4444" },
  { role: "Operations Manager", description: "Orders, shipments, products", users: 3, permissions: "Orders, Shipments, Products, Suppliers", color: "#3b82f6" },
  { role: "Finance Manager", description: "Financial operations", users: 2, permissions: "Deposits, Withdrawals, Transactions, Reports", color: "#D4A012" },
  { role: "Investment Manager", description: "Investment oversight", users: 2, permissions: "Investments, Investor KYC, Portfolios", color: GREEN },
  { role: "Compliance Manager", description: "KYC and AML", users: 2, permissions: "KYC, AML, Audit Logs, Documents", color: "#f59e0b" },
  { role: "Sales Manager", description: "CRM and buyer management", users: 4, permissions: "CRM, Buyers, RFQs, Quotations", color: "#8b5cf6" },
  { role: "Customer Support", description: "Ticket resolution", users: 6, permissions: "Support Tickets, User View (read-only)", color: "#64748b" },
  { role: "Content Manager", description: "CMS and SEO", users: 1, permissions: "CMS, SEO, Media Library, Announcements", color: "#ec4899" },
]

const STAFF = [
  { id: "ST001", name: "Zara Ahmed", email: "zara@ogexports.co", role: "Operations Manager", dept: "Operations", status: "active", lastSeen: "2 min ago" },
  { id: "ST002", name: "Hassan Raza", email: "hassan@ogexports.co", role: "Finance Manager", dept: "Finance", status: "active", lastSeen: "15 min ago" },
  { id: "ST003", name: "Aisha Siddiqui", email: "aisha@ogexports.co", role: "Compliance Manager", dept: "Compliance", status: "active", lastSeen: "1h ago" },
  { id: "ST004", name: "Omar Farooq", email: "omar@ogexports.co", role: "Customer Support", dept: "Support", status: "active", lastSeen: "5 min ago" },
  { id: "ST005", name: "Nadia Khan", email: "nadia@ogexports.co", role: "Investment Manager", dept: "Investments", status: "inactive", lastSeen: "3 days ago" },
]

export default function AdminUsers() {
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const allowedTabs = [
    "buyers",
    ...(investmentModuleEnabled ? ["investors"] : []),
    ...(supplierModuleEnabled ? ["suppliers"] : []),
    "staff",
    "roles",
  ]
  const initialTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab")
      if (t && allowedTabs.includes(t)) return t
    } catch { /* ignore */ }
    return "buyers"
  })()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [tabCounts, setTabCounts] = useState({ buyers: 0, investors: 0, suppliers: 0 })
  const [pendingCreate, setPendingCreate] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("create") === "1" } catch { return false }
  })
  const search = useSearch()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (!supplierModuleEnabled && activeTab === "suppliers") setActiveTab("buyers")
    if (!investmentModuleEnabled && activeTab === "investors") setActiveTab("buyers")
  }, [supplierModuleEnabled, investmentModuleEnabled, activeTab])

  useEffect(() => {
    const params = new URLSearchParams(search)
    const t = params.get("tab")
    if (t && allowedTabs.includes(t)) setActiveTab(t)
    if (params.get("create") === "1") setPendingCreate(true)
  }, [search, supplierModuleEnabled, investmentModuleEnabled])

  const consumeCreate = useCallback(() => {
    setPendingCreate(false)
    const params = new URLSearchParams(search)
    if (params.get("create") !== "1") return
    params.delete("create")
    const qs = params.toString()
    setLocation(`/admin/users${qs ? `?${qs}` : ""}`, { replace: true })
  }, [search, setLocation])

  useEffect(() => {
    void (async () => {
      try {
        const [buyers, investors, suppliers] = await Promise.all([
          fetchUsersPaginated({ role: "buyer", page: 1, per_page: 1 }),
          investmentModuleEnabled ? fetchUsersPaginated({ role: "investor", page: 1, per_page: 1 }) : Promise.resolve({ total: 0 }),
          supplierModuleEnabled ? fetchUsersPaginated({ role: "supplier", page: 1, per_page: 1 }) : Promise.resolve({ total: 0 }),
        ])
        setTabCounts({ buyers: buyers.total, investors: investors.total, suppliers: suppliers.total })
      } catch { /* keep defaults */ }
    })()
  }, [investmentModuleEnabled, supplierModuleEnabled])

  function selectTab(id: string) {
    setActiveTab(id)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", id)
    window.history.replaceState({}, "", url.toString())
  }

  const allUsers = getUsers()

  const TABS = [
    { id: "buyers", label: "Buyers", icon: Users, count: tabCounts.buyers },
    ...(investmentModuleEnabled ? [{ id: "investors", label: "Investors", icon: TrendingUp, count: tabCounts.investors }] : []),
    ...(supplierModuleEnabled ? [{ id: "suppliers", label: "Suppliers", icon: Building2, count: tabCounts.suppliers }] : []),
    { id: "staff", label: "Staff", icon: UserCog, count: STAFF.length },
    { id: "roles", label: "Roles & Permissions", icon: Shield, count: ROLES.length },
  ]

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <AdminLayout title="User Management" subtitle="Manage all platform users, roles and permissions">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: String(allUsers.length || tabCounts.buyers + tabCounts.investors + tabCounts.suppliers), color: "#3b82f6" },
            { label: "Pending KYC", value: String(allUsers.filter(u => u.kycStatus === "pending" || u.kycStatus === "review").length), color: "#f59e0b" },
            { label: "Suspended", value: String(allUsers.filter(u => u.status === "suspended").length), color: "#ef4444" },
            { label: "Active Today", value: String(allUsers.filter(u => u.status === "active").length), color: GREEN },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border">
          <div className="flex gap-1 p-4 border-b border-border overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} type="button" onClick={() => selectTab(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={{ background: activeTab === t.id ? EMERALD : "transparent", color: activeTab === t.id ? "white" : "#64748b" }}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: activeTab === t.id ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: activeTab === t.id ? "white" : "#64748b" }}>{t.count}</span>
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "buyers" && (
              <BuyersTab onToast={showToast} openCreate={pendingCreate} onCreateConsumed={consumeCreate} />
            )}
            {investmentModuleEnabled && activeTab === "investors" && (
              <InvestorsTab onToast={showToast} openCreate={pendingCreate} onCreateConsumed={consumeCreate} />
            )}
            {supplierModuleEnabled && activeTab === "suppliers" && (
              <SuppliersTab onToast={showToast} openCreate={pendingCreate} onCreateConsumed={consumeCreate} />
            )}

            {activeTab === "staff" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Staff Member", "Role", "Department", "Status", "Last Seen", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STAFF.map(s => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-[13px]">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground">{s.email}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px]">{s.role}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{s.dept}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.status === "active" ? "#f0fdf4" : "#f8fafc", color: s.status === "active" ? GREEN : "#64748b" }}>{s.status}</span>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{s.lastSeen}</td>
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => showToast(`Email sent to ${s.name}`)} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">Message</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "roles" && (
              <div className="space-y-3">
                {ROLES.map(r => (
                  <div key={r.role} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                      <div>
                        <div className="font-semibold text-sm">{r.role}</div>
                        <div className="text-[11px] text-muted-foreground">{r.description}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Permissions: {r.permissions}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{r.users} user{r.users !== 1 ? "s" : ""}</span>
                      <button type="button" onClick={() => showToast(`${r.role} permissions saved`)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border hover:bg-muted transition-colors">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </AdminLayout>
  )
}
