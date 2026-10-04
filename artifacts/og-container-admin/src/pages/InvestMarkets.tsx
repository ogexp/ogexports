import { useState } from "react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import {
  Leaf, TrendingUp, Package, Truck, DollarSign, Calendar,
  MapPin, CheckCircle2, Clock, ArrowUpRight, AlertCircle,
  ShoppingCart, Globe, Thermometer, Droplets
} from "lucide-react"
import { InvestNowModal } from "@/components/invest/InvestNowModal"
import { InvestorKycGate, InvestorKycRequiredBanner, useInvestorKycApproved } from "@/components/invest/InvestorKycGate"
import { LONG_TERM_PROJECTS, type LongTermProject } from "@/data/investments"
import { useLocalAuth } from "@/lib/local-auth"
import { useToast } from "@/hooks/use-toast"
import { useLocation } from "wouter"

const MARKET_STATS = [
  { label: "Total Market Value",   value: "$2.4M",  change: "+12.4%", up: true,  icon: DollarSign,  color: "text-emerald-500" },
  { label: "Active Projects",      value: "7",      change: "+2",     up: true,  icon: Leaf,        color: "text-green-500"   },
  { label: "Supply Chain Stages",  value: "6",      change: "On Track",up: true, icon: Truck,       color: "text-blue-500"    },
  { label: "Avg. Project ROI",     value: "14.2%",  change: "+1.8%",  up: true,  icon: TrendingUp,  color: "text-accent"      },
]

const SEASONAL_OPPORTUNITIES = [
  {
    season: "Summer 2026",
    months: "Jun – Sep",
    status: "active",
    commodity: "Mangoes (Sindhri, Chaunsa, Langra)",
    origin: "Sindh & Punjab, Pakistan",
    destinations: ["UAE", "UK", "Saudi Arabia", "Qatar"],
    roiRange: "12–16%",
    minInvestment: "$2,000",
    description: "Pakistan's premium mango exports peak in summer. High demand from Gulf & UK markets. Short cycle, high return.",
    riskLevel: "Medium",
    icon: "🥭",
  },
  {
    season: "Autumn 2026",
    months: "Oct – Dec",
    status: "upcoming",
    commodity: "Kinnow & Citrus",
    origin: "Punjab, Pakistan",
    destinations: ["Russia", "Central Asia", "Europe"],
    roiRange: "10–14%",
    minInvestment: "$1,500",
    description: "Kinnow citrus export season. Pakistan is the 2nd largest exporter of kinnow globally. High volume, stable returns.",
    riskLevel: "Low",
    icon: "🍊",
  },
  {
    season: "Winter 2026",
    months: "Jan – Mar",
    status: "upcoming",
    commodity: "Fresh Onion & Garlic",
    origin: "Sindh, Pakistan",
    destinations: ["Sri Lanka", "Bangladesh", "Malaysia"],
    roiRange: "8–12%",
    minInvestment: "$1,000",
    description: "Fresh onion and garlic exports. Year-round South Asian demand. Consistent returns, short trade cycles.",
    riskLevel: "Low",
    icon: "🧅",
  },
  {
    season: "Year-Round",
    months: "All Year",
    status: "active",
    commodity: "Mixed Vegetables (Potato, Tomato, Chilli)",
    origin: "Punjab, Pakistan",
    destinations: ["Afghanistan", "UAE", "Kuwait"],
    roiRange: "9–13%",
    minInvestment: "$2,500",
    description: "Year-round export of fresh vegetables. Stable demand, diversified customer base, low seasonal risk.",
    riskLevel: "Low",
    icon: "🥦",
  },
]

const ACTIVE_PROJECTS = [
  {
    id: "MKT-001",
    name: "Sindhri Mango — UAE Shipment",
    commodity: "Premium Mango",
    origin: "Hyderabad, Sindh",
    destination: "Dubai, UAE",
    investedAmount: 42000,
    targetAmount: 60000,
    myInvestment: 3000,
    expectedReturn: 3480,
    roi: 16.0,
    status: "funding",
    stage: "Procurement",
    timeline: "Jun 15 – Jul 30, 2026",
    icon: "🥭",
  },
  {
    id: "MKT-002",
    name: "Kinnow Orange — European Market",
    commodity: "Kinnow Citrus",
    origin: "Sargodha, Punjab",
    destination: "Rotterdam, Netherlands",
    investedAmount: 28000,
    targetAmount: 40000,
    myInvestment: 2000,
    expectedReturn: 2260,
    roi: 13.0,
    status: "active",
    stage: "Cold Chain Transport",
    timeline: "Oct 01 – Dec 15, 2026",
    icon: "🍊",
  },
  {
    id: "MKT-003",
    name: "Fresh Onion — Bangladesh Export",
    commodity: "Fresh Onion",
    origin: "Badin, Sindh",
    destination: "Chittagong, Bangladesh",
    investedAmount: 18000,
    targetAmount: 18000,
    myInvestment: 1500,
    expectedReturn: 1665,
    roi: 11.0,
    status: "completed",
    stage: "Settled",
    timeline: "Jan 10 – Feb 28, 2026",
    icon: "🧅",
  },
]

const SUPPLY_CHAIN = [
  { step: 1, label: "Farm Procurement",   desc: "Direct sourcing from certified farms across Punjab & Sindh",           icon: Leaf,        done: true  },
  { step: 2, label: "Quality Inspection", desc: "Third-party lab testing and grading to export standards",               icon: CheckCircle2,done: true  },
  { step: 3, label: "Cold Chain Storage", desc: "Temperature-controlled storage at Karachi cold chain facility",         icon: Thermometer, done: true  },
  { step: 4, label: "Packaging & Grading",desc: "Premium export-grade packaging with country-specific labels",           icon: Package,     done: true  },
  { step: 5, label: "Customs & Clearance",desc: "TDAP documentation, phytosanitary certificates, customs clearance",     icon: Globe,       done: false },
  { step: 6, label: "Port Loading",       desc: "Reefer container loading at Port Qasim or Karachi Port",                icon: Truck,       done: false },
]

const SALES_DATA = [
  { month: "Jan", mangoes: 0,    citrus: 12000, vegetables: 8400  },
  { month: "Feb", mangoes: 0,    citrus: 9800,  vegetables: 7200  },
  { month: "Mar", mangoes: 0,    citrus: 4200,  vegetables: 9100  },
  { month: "Apr", mangoes: 4800, citrus: 0,     vegetables: 8800  },
  { month: "May", mangoes: 18400,citrus: 0,     vegetables: 10200 },
  { month: "Jun", mangoes: 32000,citrus: 0,     vegetables: 9400  },
  { month: "Jul", mangoes: 28600,citrus: 0,     vegetables: 11200 },
]

const STATUS_META: Record<string, { label: string; cls: string }> = {
  funding:   { label: "Funding Open",  cls: "bg-blue-500/15 text-blue-600" },
  active:    { label: "In Progress",   cls: "bg-emerald-500/15 text-emerald-600" },
  completed: { label: "Settled",       cls: "bg-muted text-muted-foreground" },
}

const FV_PROJECT = LONG_TERM_PROJECTS.find(p => p.id === "prj-001")!

export default function InvestMarkets() {
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "supply" | "seasonal">("overview")
  const { toast } = useToast()
  const { user: localUser } = useLocalAuth()
  const [, setLocation] = useLocation()
  const { approved: kycApproved } = useInvestorKycApproved()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<LongTermProject>(FV_PROJECT)

  function openInvestModal(project: LongTermProject) {
    if (!localUser) {
      toast({ title: "Login Required", description: "Please sign in with an investor account to invest.", variant: "destructive" })
      return
    }
    if (localUser.accountType !== "investor") {
      toast({ title: "Investor Account Required", description: "Please switch to an investor account.", variant: "destructive" })
      return
    }
    if (!kycApproved) {
      toast({ title: "KYC Required", description: "Complete KYC verification before investing.", variant: "destructive" })
      setLocation("/invest/kyc")
      return
    }
    setSelectedProject(project)
    setModalOpen(true)
  }

  return (
    <>
    <InvestPortalLayout title="Fresh Fruits & Vegetable Markets" subtitle="Seasonal export investments — farm to global market">
      <div className="space-y-8">
        <InvestorKycRequiredBanner />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {MARKET_STATS.map(s => (
            <Card key={s.label} className="glass-card hover:border-accent/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <span className={`text-xs font-medium flex items-center gap-1 ${s.up ? "text-emerald-500" : "text-red-400"}`}>
                    <ArrowUpRight className="w-3 h-3" />{s.change}
                  </span>
                </div>
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { key: "overview",  label: "Overview" },
            { key: "seasonal",  label: "Seasonal Opportunities" },
            { key: "projects",  label: "Active Projects" },
            { key: "supply",    label: "Supply Chain" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Sales chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Commodity Sales Performance</CardTitle>
                <p className="text-xs text-muted-foreground">Monthly export value by commodity (USD)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={SALES_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                    <Bar dataKey="mangoes"    name="Mangoes"    fill="#f59e0b" radius={[3,3,0,0]} />
                    <Bar dataKey="citrus"     name="Citrus"     fill="#f97316" radius={[3,3,0,0]} />
                    <Bar dataKey="vegetables" name="Vegetables" fill="#16a34a" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Portfolio summary */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "My Markets Investment",  value: "$6,500",   desc: "Across 3 active projects",    color: "bg-emerald-500/15", textColor: "text-emerald-600" },
                { label: "Expected Returns",        value: "$7,405",   desc: "Projected total return",      color: "bg-accent/15",      textColor: "text-amber-700"  },
                { label: "Avg. Cycle Duration",     value: "45 days",  desc: "From procurement to settlement",color: "bg-blue-500/15", textColor: "text-blue-600"   },
              ].map(s => (
                <Card key={s.label} className="glass-card">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                      <TrendingUp className={`w-5 h-5 ${s.textColor}`} />
                    </div>
                    <p className="text-2xl font-heading font-bold">{s.value}</p>
                    <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Seasonal Opportunities tab */}
        {activeTab === "seasonal" && (
          <div className="grid md:grid-cols-2 gap-5">
            {SEASONAL_OPPORTUNITIES.map(opp => (
              <Card key={opp.season} className={`glass-card transition-all hover:shadow-md ${opp.status === "active" ? "border-emerald-500/30" : ""}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{opp.icon}</span>
                      <div>
                        <h3 className="font-heading font-bold text-base">{opp.season}</h3>
                        <p className="text-xs text-muted-foreground">{opp.months}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] border-0 shrink-0 ${opp.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {opp.status === "active" ? "● Active Now" : "Upcoming"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{opp.commodity}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opp.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ROI Range</p>
                      <p className="text-sm font-bold text-accent">{opp.roiRange}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Min. Investment</p>
                      <p className="text-sm font-bold">{opp.minInvestment}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Origin</p>
                      <p className="text-sm font-semibold">{opp.origin}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Risk Level</p>
                      <p className={`text-sm font-bold ${opp.riskLevel === "Low" ? "text-emerald-500" : "text-amber-500"}`}>{opp.riskLevel}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Export Destinations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opp.destinations.map(d => <Badge key={d} className="text-[10px] bg-primary/8 text-primary border-0">{d}</Badge>)}
                    </div>
                  </div>
                  <InvestorKycGate
                    className="w-full"
                    size="sm"
                    variant={opp.status === "active" ? "default" : "outline"}
                    disabled={opp.status !== "active"}
                    actionName="invest in this market opportunity"
                    onClick={() => opp.status === "active" && openInvestModal(FV_PROJECT)}
                  >
                    {opp.status === "active" ? "Invest Now" : "View When Available"}
                  </InvestorKycGate>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Active Projects tab */}
        {activeTab === "projects" && (
          <div className="space-y-5">
            {ACTIVE_PROJECTS.map(p => {
              const pct = Math.round((p.investedAmount / p.targetAmount) * 100)
              const meta = STATUS_META[p.status]
              return (
                <Card key={p.id} className="glass-card hover:border-accent/30 transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <span className="text-4xl">{p.icon}</span>
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-bold text-base">{p.name}</h3>
                              <Badge className={`text-[10px] border-0 ${meta.cls}`}>{meta.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3 inline mr-1" />{p.origin} → {p.destination}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">My Investment</p>
                            <p className="text-lg font-heading font-bold">${p.myInvestment.toLocaleString()}</p>
                            <p className="text-xs text-accent">Expected: ${p.expectedReturn.toLocaleString()} ({p.roi}% ROI)</p>
                          </div>
                        </div>
                        {/* Funding progress */}
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-muted-foreground">Funding: ${p.investedAmount.toLocaleString()} / ${p.targetAmount.toLocaleString()}</span>
                            <span className="font-bold text-accent">{pct}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span className="text-muted-foreground"><strong className="text-foreground">Stage:</strong> {p.stage}</span>
                          <span className="text-muted-foreground"><strong className="text-foreground">Timeline:</strong> {p.timeline}</span>
                          <span className="text-muted-foreground"><strong className="text-foreground">Commodity:</strong> {p.commodity}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Supply Chain tab */}
        {activeTab === "supply" && (
          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Truck className="w-4 h-4 text-accent" /> Farm-to-Port Supply Chain
                </CardTitle>
                <p className="text-xs text-muted-foreground">Live status of current active shipment (Mango — UAE)</p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {SUPPLY_CHAIN.map((step, i) => (
                    <div key={step.step} className="flex gap-4 pb-8 last:pb-0 relative">
                      {i < SUPPLY_CHAIN.length - 1 && (
                        <div className={`absolute left-5 top-10 bottom-0 w-0.5 ${step.done ? "bg-emerald-500/40" : "bg-border"}`} />
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${
                        step.done ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                      }`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{step.label}</h4>
                          {step.done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            : <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                        </div>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Logistics snapshot */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">Cold Chain Status</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Storage Temp", value: "2–4°C", ok: true },
                      { label: "Humidity",     value: "85–90%", ok: true },
                      { label: "Facility",     value: "Karachi Cold Store", ok: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-semibold flex items-center gap-1 ${item.ok ? "text-emerald-500" : "text-red-400"}`}>
                          {item.ok && <CheckCircle2 className="w-3 h-3" />}{item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold">Quality Control</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Pesticide Residue", value: "Pass",    ok: true  },
                      { label: "Phytosanitary Cert", value: "Issued", ok: true  },
                      { label: "Moisture Content",   value: "12.4%",  ok: true  },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-semibold flex items-center gap-1 ${item.ok ? "text-emerald-500" : "text-red-400"}`}>
                          {item.ok && <CheckCircle2 className="w-3 h-3" />}{item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </InvestPortalLayout>

    {selectedProject && (
      <InvestNowModal
        investment={selectedProject}
        initialAmount={selectedProject.minInvestment}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    )}
    </>
  )
}
