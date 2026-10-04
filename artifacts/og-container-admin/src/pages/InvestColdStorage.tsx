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
  Thermometer, TrendingUp, DollarSign, Calendar, CheckCircle2,
  Clock, Shield, Building2, Zap, Lock, Info, ArrowUpRight,
  FileText, Snowflake, Package, Gauge, Users, AlertCircle
} from "lucide-react"
import { InvestNowModal } from "@/components/invest/InvestNowModal"
import type { LongTermProject } from "@/data/investments"
import { useLocalAuth } from "@/lib/local-auth"
import { useToast } from "@/hooks/use-toast"

const FACILITY_STATS = [
  { label: "Total Capacity",      value: "2,400 MT",  sub: "Cold + ambient storage",   icon: Package,     color: "text-blue-500"    },
  { label: "Annual Lease Return", value: "9–11%",     sub: "Per annum on capital",      icon: TrendingUp,  color: "text-emerald-500" },
  { label: "Infrastructure Age",  value: "Yr 2 / 20", sub: "Modern, long-life asset",   icon: Building2,   color: "text-accent"      },
  { label: "Occupancy Rate",      value: "94%",       sub: "Year-round utilization",    icon: Gauge,       color: "text-primary"     },
]

const INVESTMENT_TIERS = [
  {
    name: "Starter Unit",
    capital: "$5,000",
    annualYield: "9.0%",
    annualProfit: "$450",
    tenure: "3 Years",
    payoutSchedule: "Annually",
    allocation: "100 MT cold space",
    slots: 8,
    slotsLeft: 3,
    popular: false,
  },
  {
    name: "Growth Unit",
    capital: "$15,000",
    annualYield: "10.0%",
    annualProfit: "$1,500",
    tenure: "5 Years",
    payoutSchedule: "Annually",
    allocation: "300 MT cold space",
    slots: 5,
    slotsLeft: 2,
    popular: true,
  },
  {
    name: "Enterprise Unit",
    capital: "$50,000",
    annualYield: "11.0%",
    annualProfit: "$5,500",
    tenure: "7 Years",
    payoutSchedule: "Annually",
    allocation: "1,000 MT cold space",
    slots: 3,
    slotsLeft: 1,
    popular: false,
  },
]

const YEARLY_PROJECTIONS = [
  { year: "Year 1",  yield9: 450,  yield10: 1500,  yield11: 5500  },
  { year: "Year 2",  yield9: 450,  yield10: 1500,  yield11: 5500  },
  { year: "Year 3",  yield9: 450,  yield10: 1500,  yield11: 5500  },
  { year: "Year 4",  yield9: null, yield10: 1500,  yield11: 5500  },
  { year: "Year 5",  yield9: null, yield10: 1500,  yield11: 5500  },
  { year: "Year 6",  yield9: null, yield10: null,  yield11: 5500  },
  { year: "Year 7",  yield9: null, yield10: null,  yield11: 5500  },
]

const FACILITY_FEATURES = [
  { icon: Snowflake,  label: "Temperature Zones",   value: "-18°C IQF · 0–4°C Fresh · Ambient" },
  { icon: Zap,        label: "Power Backup",         value: "Dual-generator, 72-hr UPS"          },
  { icon: Shield,     label: "Security",             value: "CCTV, biometric access, 24/7 guard"  },
  { icon: Users,      label: "Certified Operators",  value: "PSQCA & HACCP-trained staff"         },
  { icon: Package,    label: "Total Cold Capacity",  value: "1,800 MT (IQF + fresh)"              },
  { icon: Building2,  label: "Location",             value: "Depalpur Industrial Zone, Punjab"    },
]

const PAST_PAYOUTS = [
  { year: "2025", yield: "10.4%", amountPerUnit: "$1,560 / $15k unit", date: "Dec 15, 2025", status: "paid" },
  { year: "2024", yield: "9.8%",  amountPerUnit: "$1,470 / $15k unit", date: "Dec 12, 2024", status: "paid" },
  { year: "2023", yield: "9.2%",  amountPerUnit: "$1,380 / $15k unit", date: "Dec 10, 2023", status: "paid" },
]

const HOW_IT_WORKS = [
  { step: 1, label: "One-Time Capital Deposit",   desc: "Invest your chosen unit amount. No recurring calls, no ongoing commitments." },
  { step: 2, label: "Asset Leased to Operators",  desc: "Your allocated cold storage space is commercially leased to food exporters, processors and distributors." },
  { step: 3, label: "Annual Lease Revenue",        desc: "Net lease income is calculated after operational costs. Audited financial statements issued each year." },
  { step: 4, label: "Yearly Profit Distribution", desc: "Annual profit transferred to your OG Exports wallet every December. No reinvestment required." },
  { step: 5, label: "Capital Return at Maturity",  desc: "At end of tenure, your original capital is returned in full to your registered account." },
]

export default function InvestColdStorage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tiers" | "facility" | "projections">("overview")
  const { toast } = useToast()
  const { user: localUser } = useLocalAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<LongTermProject | null>(null)

  function buildProjectFromTier(tier: typeof INVESTMENT_TIERS[0]): LongTermProject {
    const min = parseInt(tier.capital.replace(/[^0-9]/g, ""), 10)
    const roi = parseFloat(tier.annualYield.replace(/[^0-9.]/g, ""))
    const tenureMonths = parseInt(tier.tenure) * 12
    return {
      id: tier.name.toLowerCase().replace(/\s+/g, "-"),
      slug: tier.name.toLowerCase().replace(/\s+/g, "-"),
      name: `Cold Storage — ${tier.name}`,
      category: "cold-storage",
      shortDescription: `Annual yield of ${tier.annualYield} on a ${tier.tenure} tenure. ${tier.allocation} allocated.`,
      fullDescription: `One-time capital investment of ${tier.capital} into OG Exports cold storage infrastructure. Annual lease income distributed each December.`,
      fundingTarget: min * tier.slots,
      currentFunding: min * (tier.slots - tier.slotsLeft),
      minInvestment: min, maxInvestment: min,
      investmentPeriodMonths: tenureMonths, expectedReturnPct: roi,
      expectedCompletionDate: "2031-12-01",
      riskLevel: "low",
      status: tier.slotsLeft > 0 ? "open" : "funded",
      totalInvestors: tier.slots - tier.slotsLeft,
      imageUrls: [], highlights: [], documents: [],
    }
  }

  function openInvestModal(tier: typeof INVESTMENT_TIERS[0]) {
    if (!localUser) {
      toast({ title: "Login Required", description: "Please sign in with an investor account.", variant: "destructive" })
      return
    }
    if (localUser.accountType !== "investor") {
      toast({ title: "Investor Account Required", description: "Please switch to an investor account.", variant: "destructive" })
      return
    }
    setSelectedProject(buildProjectFromTier(tier))
    setModalOpen(true)
  }

  return (
    <>
    <InvestPortalLayout title="Cold Storage Infrastructure" subtitle="One-time capital investment — fixed-asset annual yield">
      <div className="space-y-8">

        {/* Category badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="bg-blue-500/15 text-blue-600 border-0 text-xs flex items-center gap-1.5">
            <Snowflake className="w-3 h-3" /> Cold Storage Investment
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">● Slots Available</Badge>
          <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs">Annual Yield · Long Term</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FACILITY_STATS.map(s => (
            <Card key={s.label} className="glass-card hover:border-accent/30 transition-colors">
              <CardContent className="p-5">
                <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { key: "overview",    label: "How It Works" },
            { key: "tiers",       label: "Investment Tiers" },
            { key: "facility",    label: "Facility Details" },
            { key: "projections", label: "Yield Projections" },
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

        {/* How It Works */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-heading font-bold text-lg">How Cold Storage Investment Works</h3>
                <div className="relative space-y-0">
                  {HOW_IT_WORKS.map((item, i) => (
                    <div key={item.step} className="flex gap-4 pb-8 last:pb-0 relative">
                      {i < HOW_IT_WORKS.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-blue-500/20" />
                      )}
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 z-10">
                        <span className="text-sm font-bold text-blue-600">{item.step}</span>
                      </div>
                      <div className="pt-1.5">
                        <h4 className="text-sm font-bold mb-1">{item.label}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Key benefits */}
                <Card className="glass-card border-blue-500/20">
                  <CardContent className="p-5 space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Key Benefits
                    </h4>
                    {[
                      "One-time investment — no ongoing commitments",
                      "Fixed annual yield (9–11%) on deployed capital",
                      "Hard infrastructure asset — not commodity-dependent",
                      "Full capital return at end of agreed tenure",
                      "Annual audited financial statements provided",
                      "Priority allocation for future expansion phases",
                    ].map(b => (
                      <div key={b} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{b}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Past payouts */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" /> Historical Annual Payouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {PAST_PAYOUTS.map(p => (
                        <div key={p.year} className="flex items-center justify-between px-5 py-3.5">
                          <div>
                            <p className="text-sm font-semibold">{p.year} Payout</p>
                            <p className="text-xs text-muted-foreground">{p.date} · {p.amountPerUnit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-accent">{p.yield}</p>
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Paid</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Investment Tiers */}
        {activeTab === "tiers" && (
          <div className="grid md:grid-cols-3 gap-5">
            {INVESTMENT_TIERS.map(tier => (
              <Card key={tier.name} className={`glass-card relative overflow-hidden transition-all hover:shadow-lg ${
                tier.popular ? "border-accent/40 shadow-accent/10 shadow-md" : ""
              }`}>
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
                )}
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-heading font-bold text-base">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{tier.tenure} tenure</p>
                    </div>
                    {tier.popular && (
                      <Badge className="bg-accent/15 text-amber-700 border-0 text-[10px]">Most Popular</Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-3xl font-heading font-bold">{tier.capital}</p>
                    <p className="text-xs text-muted-foreground">one-time investment</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Yield</p>
                      <p className="text-lg font-bold text-accent">{tier.annualYield}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual Profit</p>
                      <p className="text-lg font-bold">{tier.annualProfit}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Payout Schedule", value: tier.payoutSchedule },
                      { label: "Storage Allocation", value: tier.allocation },
                      { label: "Slots Remaining", value: `${tier.slotsLeft} of ${tier.slots}` },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Slot availability */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Slots filled</span>
                      <span className="font-semibold text-accent">{Math.round(((tier.slots - tier.slotsLeft) / tier.slots) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${((tier.slots - tier.slotsLeft) / tier.slots) * 100}%` }} />
                    </div>
                  </div>

                  <Button className="w-full" variant={tier.popular ? "default" : "outline"} size="sm"
                    onClick={() => openInvestModal(tier)}>
                    Reserve Slot
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Facility Details */}
        {activeTab === "facility" && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FACILITY_FEATURES.map(f => (
                <Card key={f.label} className="glass-card">
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{f.label}</p>
                      <p className="text-sm font-bold mt-0.5">{f.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Certifications */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <h4 className="font-heading font-bold text-base mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" /> Regulatory Compliance
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { cert: "PSQCA Licensed", desc: "Pakistan Standards & Quality Control Authority" },
                    { cert: "TDAP Registered", desc: "Trade Development Authority of Pakistan" },
                    { cert: "SECP Registered", desc: "Securities & Exchange Commission of Pakistan" },
                  ].map(c => (
                    <div key={c.cert} className="flex items-start gap-3 p-4 rounded-xl bg-muted/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">{c.cert}</p>
                        <p className="text-xs text-muted-foreground">{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Yield Projections */}
        {activeTab === "projections" && (
          <div className="space-y-5">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Projected Annual Earnings by Tier</CardTitle>
                <p className="text-xs text-muted-foreground">Illustrative projections — subject to actual lease income</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={YEARLY_PROJECTIONS} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                    <Bar dataKey="yield9"  name="Starter ($5k)"    fill="#60a5fa" radius={[3,3,0,0]} />
                    <Bar dataKey="yield10" name="Growth ($15k)"    fill="#16a34a" radius={[3,3,0,0]} />
                    <Bar dataKey="yield11" name="Enterprise ($50k)" fill="#C6A969" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block"/>&nbsp;Starter 9%</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block"/>&nbsp;Growth 10%</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"/>&nbsp;Enterprise 11%</span>
                </div>
              </CardContent>
            </Card>

            {/* Summary table */}
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Capital</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Annual Yield</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">3-Yr Total</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">5-Yr Total</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">7-Yr Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        { tier: "Starter", capital: 5000,  yieldPct: 9,  y3: 1350,  y5: 2250,  y7: 3150  },
                        { tier: "Growth",  capital: 15000, yieldPct: 10, y3: 4500,  y5: 7500,  y7: 10500 },
                        { tier: "Enterprise", capital: 50000, yieldPct: 11, y3: 16500, y5: 27500, y7: 38500 },
                      ].map(r => (
                        <tr key={r.tier} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4 font-semibold">{r.tier}</td>
                          <td className="px-5 py-4 text-right font-mono">${r.capital.toLocaleString()}</td>
                          <td className="px-5 py-4 text-right font-bold text-accent">{r.yieldPct}% p.a.</td>
                          <td className="px-5 py-4 text-right font-mono text-emerald-500">+${r.y3.toLocaleString()}</td>
                          <td className="px-5 py-4 text-right font-mono text-emerald-500">+${r.y5.toLocaleString()}</td>
                          <td className="px-5 py-4 text-right font-mono text-emerald-500">+${r.y7.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Risk Disclaimer */}
        <Card className="glass-card border-amber-500/20 bg-amber-500/3">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-amber-700">Important Risk Disclosure — Cold Storage Investment</p>
                <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                  <p>• <strong>Capital at Risk:</strong> All investments carry risk. Past performance (historical payouts) is not a guarantee of future returns. The value of your investment and the income derived from it may fall as well as rise.</p>
                  <p>• <strong>Illiquid Asset:</strong> Cold storage infrastructure investments are long-term and illiquid. Early exit prior to tenure maturity may not be possible or may result in a reduced capital return.</p>
                  <p>• <strong>Yield Variability:</strong> Annual yields of 9–11% are projections based on current occupancy and lease rates. Actual returns depend on facility occupancy, market lease rates, and operational costs, which may fluctuate.</p>
                  <p>• <strong>Regulatory Risk:</strong> Changes in Pakistani tax law, export regulations, or food safety legislation may impact operational profitability and investor distributions.</p>
                  <p>• <strong>Not a Deposit:</strong> This investment is not a bank deposit and is not covered by any deposit protection scheme. OG Exports is not a licensed financial institution.</p>
                  <p>• <strong>Independent Advice:</strong> Investors are strongly advised to seek independent legal, financial, and tax advice before committing capital.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
