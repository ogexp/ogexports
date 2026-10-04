import { useState } from "react"
import { useGetMe } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Link } from "wouter"
import {
  User, Building2, Shield, Bell, Landmark, Clock,
  Camera, CheckCircle2, AlertCircle, Pencil, Save,
  Eye, EyeOff, Smartphone, Lock, Globe, Mail, Phone,
  LayoutDashboard, CircleDollarSign, ArrowUpRight, BarChart2,
  UserCog, SlidersHorizontal, ChevronRight, TrendingUp, Wallet
} from "lucide-react"

const LOGIN_HISTORY = [
  { id: 1, device: "Chrome · MacOS", location: "Karachi, Pakistan", time: "Today, 09:45 AM", current: true },
  { id: 2, device: "Safari · iPhone", location: "Lahore, Pakistan", time: "Yesterday, 06:12 PM", current: false },
  { id: 3, device: "Chrome · Windows", location: "Karachi, Pakistan", time: "Jul 9, 2026, 11:30 AM", current: false },
  { id: 4, device: "Firefox · MacOS", location: "Dubai, UAE", time: "Jul 7, 2026, 3:15 PM", current: false },
]

const ACTIVE_SESSIONS = [
  { id: 1, device: "Chrome · MacOS 14", ip: "182.180.xxx.xxx", location: "Karachi", lastSeen: "Active now", current: true },
  { id: 2, device: "Safari · iPhone 15", ip: "103.254.xxx.xxx", location: "Lahore", lastSeen: "2 hours ago", current: false },
]

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  )
}

function FieldRow({ label, value, type = "text", placeholder }: { label: string; value: string; type?: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const { toast } = useToast()
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-border/30 last:border-0">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider w-36 shrink-0">{label}</Label>
      <div className="flex-1 flex items-center gap-2">
        {editing ? (
          <>
            <Input value={val} onChange={e => setVal(e.target.value)} type={type} className="h-8 text-sm" />
            <Button size="sm" className="h-8 px-3 gap-1" onClick={() => { setEditing(false); toast({ title: "Saved", description: `${label} updated.` }) }}>
              <Save className="w-3 h-3" /> Save
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium flex-1">{val || <span className="text-muted-foreground italic">Not set</span>}</span>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-50 hover:opacity-100" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

const PORTAL_LINKS = [
  { href: "/invest/dashboard", label: "Dashboard",      desc: "Overview, KPIs & charts",          Icon: LayoutDashboard,  color: "text-primary",          bg: "bg-primary/8",      border: "border-primary/20" },
  { href: "/invest/deposit",   label: "Deposit",        desc: "Fund your account",                 Icon: CircleDollarSign,  color: "text-emerald-600",      bg: "bg-emerald-500/8",  border: "border-emerald-500/20" },
  { href: "/invest/withdraw",  label: "Withdraw",       desc: "Request a payout",                  Icon: ArrowUpRight,      color: "text-amber-600",        bg: "bg-amber-500/8",    border: "border-amber-500/20" },
  { href: "/invest/reports",   label: "Reports",        desc: "Statements & analytics",            Icon: BarChart2,         color: "text-blue-600",         bg: "bg-blue-500/8",     border: "border-blue-500/20" },
  { href: "/invest/profile",   label: "Investor Profile", desc: "KYC, bank & tax details",        Icon: UserCog,           color: "text-violet-600",       bg: "bg-violet-500/8",   border: "border-violet-500/20" },
  { href: "/invest/settings",  label: "Portal Settings", desc: "Notifications & security",        Icon: SlidersHorizontal, color: "text-foreground/70",    bg: "bg-muted/60",       border: "border-border/50" },
]

export function ProfileTab() {
  const { data: me } = useGetMe()
  const { toast } = useToast()
  const [showPass, setShowPass] = useState(false)
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(false)

  const isInvestor = me?.accountType === "investor"

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal">
        <TabsList className="bg-muted/50 h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <User className="w-3.5 h-3.5" /> Personal
          </TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Company
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <Landmark className="w-3.5 h-3.5" /> Bank Details
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Sessions
          </TabsTrigger>
          {isInvestor && (
            <TabsTrigger value="invest-portal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Investment Portal
            </TabsTrigger>
          )}
        </TabsList>

        {/* Personal */}
        <TabsContent value="personal" className="mt-6 space-y-6">
          <SectionCard title="Profile Photo" icon={Camera}>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                {me?.accountType?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, or GIF. Max 5 MB.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2"><Camera className="w-3.5 h-3.5" /> Upload Photo</Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50">Remove</Button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Personal Information" icon={User}>
            <div>
              <FieldRow label="Full Name" value="Muhammad Ali Khan" />
              <FieldRow label="Email" value="m.ali@example.com" type="email" />
              <FieldRow label="Phone" value="+92 300 1234567" type="tel" />
              <FieldRow label="Date of Birth" value="1985-06-15" type="date" />
              <FieldRow label="Nationality" value="Pakistani" />
              <FieldRow label="CNIC / Passport" value="42101-1234567-1" />
              <FieldRow label="Address" value="123 Trade Street, Karachi" />
              <FieldRow label="City" value="Karachi" />
              <FieldRow label="Country" value="Pakistan" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* Company */}
        <TabsContent value="company" className="mt-6 space-y-6">
          <SectionCard title="Company Logo" icon={Camera}>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-primary/60" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Company Logo</p>
                <p className="text-xs text-muted-foreground">PNG with transparent background preferred. Max 5 MB.</p>
                <Button size="sm" variant="outline" className="gap-2"><Camera className="w-3.5 h-3.5" /> Upload Logo</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Company Information" icon={Building2}>
            <div>
              <FieldRow label="Company Name" value="OG Trading Co. (Pvt) Ltd" />
              <FieldRow label="Registration No." value="PKT-2018-0034567" />
              <FieldRow label="NTN" value="1234567-8" />
              <FieldRow label="Industry" value="Agricultural Commodities Export" />
              <FieldRow label="Website" value="https://example.com" type="url" />
              <FieldRow label="Est. Year" value="2018" />
              <FieldRow label="Employees" value="50–200" />
              <FieldRow label="Business Type" value="Exporter / Trader" />
              <FieldRow label="Office Address" value="3rd Floor, Trade Tower, I.I. Chundrigar Road, Karachi" />
            </div>
          </SectionCard>

          <SectionCard title="Company Documents" icon={Globe}>
            {[
              { label: "Business Registration Certificate", status: "verified" },
              { label: "NTN Certificate", status: "verified" },
              { label: "Bank Statement (6 months)", status: "pending" },
              { label: "EOBI / Tax Clearance", status: "missing" },
            ].map(doc => (
              <div key={doc.label} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                <span className="text-sm">{doc.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={
                    doc.status === "verified" ? "border-emerald-500/40 text-emerald-600" :
                    doc.status === "pending" ? "border-amber-500/40 text-amber-600" :
                    "border-red-500/40 text-red-600"
                  }>{doc.status}</Badge>
                  {doc.status === "missing" && <Button size="sm" variant="outline" className="h-7 text-xs">Upload</Button>}
                </div>
              </div>
            ))}
          </SectionCard>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank" className="mt-6 space-y-6">
          <SectionCard title="Primary Bank Account" icon={Landmark}>
            <div>
              <FieldRow label="Bank Name" value="Meezan Bank Limited" />
              <FieldRow label="Account Title" value="Muhammad Ali Khan" />
              <FieldRow label="Account Number" value="0123-0134567890" />
              <FieldRow label="IBAN" value="PK36MEZN0000001234567890" />
              <FieldRow label="Branch" value="I.I. Chundrigar Road, Karachi" />
              <FieldRow label="Branch Code" value="0123" />
              <FieldRow label="Swift Code" value="MEZNPKKA" />
              <FieldRow label="Currency" value="PKR" />
            </div>
          </SectionCard>

          <SectionCard title="International / USD Account" icon={Globe}>
            <div>
              <FieldRow label="Bank Name" value="Standard Chartered Bank" />
              <FieldRow label="Account Title" value="OG Trading Co. (Pvt) Ltd" />
              <FieldRow label="Account Number" value="01-9876543-01" />
              <FieldRow label="IBAN" value="PK84SCBL0000001234567890" />
              <FieldRow label="Swift Code" value="SCBLPKKX" />
              <FieldRow label="Currency" value="USD" />
              <FieldRow label="Correspondent Bank" value="Standard Chartered NY" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <SectionCard title="Change Password" icon={Lock}>
            <div className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button className="w-full gap-2" onClick={() => toast({ title: "Password Updated", description: "Your password has been changed." })}>
                <Lock className="w-4 h-4" /> Update Password
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Two-Factor Authentication (2FA)" icon={Smartphone}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Authenticator App (TOTP)</p>
                <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or similar apps for an extra layer of security.</p>
                {twoFaEnabled && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 mt-2">Enabled</Badge>
                )}
              </div>
              <Button
                variant={twoFaEnabled ? "outline" : "default"}
                size="sm"
                onClick={() => {
                  setTwoFaEnabled(!twoFaEnabled)
                  toast({ title: twoFaEnabled ? "2FA Disabled" : "2FA Enabled", description: twoFaEnabled ? "Two-factor authentication disabled." : "Your account is now more secure." })
                }}
              >
                {twoFaEnabled ? "Disable" : "Enable"} 2FA
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Login History" icon={Clock}>
            <div className="divide-y divide-border/40">
              {LOGIN_HISTORY.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {item.device}
                      {item.current && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Current</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.location} · {item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <SectionCard title="Notification Preferences" icon={Bell}>
            <div className="space-y-1">
              {[
                { label: "Email Notifications", desc: "Receive updates via email", enabled: emailNotif, toggle: () => setEmailNotif(!emailNotif) },
                { label: "Push Notifications", desc: "Browser / mobile push alerts", enabled: pushNotif, toggle: () => setPushNotif(!pushNotif) },
                { label: "Deposit & Withdrawal Alerts", desc: "Notify on financial activity", enabled: true, toggle: () => {} },
                { label: "Investment Updates", desc: "Container status and returns", enabled: true, toggle: () => {} },
                { label: "KYC Status Updates", desc: "Verification approvals & rejections", enabled: true, toggle: () => {} },
                { label: "Shipment Tracking", desc: "Cargo movement notifications", enabled: true, toggle: () => {} },
                { label: "RFQ Responses", desc: "Supplier quote notifications", enabled: true, toggle: () => {} },
                { label: "Admin Announcements", desc: "Platform news and updates", enabled: emailNotif, toggle: () => {} },
                { label: "Marketing & Promotions", desc: "Offers and promotional content", enabled: false, toggle: () => {} },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => { item.toggle(); toast({ title: `${item.label} ${item.enabled ? "disabled" : "enabled"}` }) }}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${item.enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.enabled ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Investment Portal */}
        {isInvestor && (
          <TabsContent value="invest-portal" className="mt-6 space-y-6">
            {/* Quick access grid */}
            <SectionCard title="Quick Access" icon={LayoutDashboard}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PORTAL_LINKS.map(({ href, label, desc, Icon, color, bg, border }) => (
                  <Link key={href} href={href}>
                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${border} ${bg} hover:opacity-90 transition-all cursor-pointer group`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${border} bg-background`}>
                        <Icon className={`w-4.5 h-4.5 ${color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${color} flex items-center gap-1`}>
                          {label}
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>

            {/* Investment summary snapshot */}
            <SectionCard title="Portfolio Snapshot" icon={TrendingUp}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Invested",   value: "$48,500",  sub: "across 3 active deals", color: "text-primary" },
                  { label: "Total Returns",    value: "$6,240",   sub: "+12.87% overall",        color: "text-emerald-600" },
                  { label: "Wallet Balance",   value: "$3,750",   sub: "available to withdraw",  color: "text-blue-600" },
                  { label: "Pending Deposits", value: "$2,000",   sub: "under review",           color: "text-amber-600" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-lg border border-border/50 bg-card/60 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-xl font-bold font-heading ${stat.color}`}>{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Wallet quick actions */}
            <SectionCard title="Quick Actions" icon={Wallet}>
              <div className="flex flex-wrap gap-3">
                <Link href="/invest/deposit">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
                    <CircleDollarSign className="w-4 h-4" /> Make a Deposit
                  </button>
                </Link>
                <Link href="/invest/withdraw">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors">
                    <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
                  </button>
                </Link>
                <Link href="/invest/reports">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500/30 text-blue-600 bg-blue-500/8 text-sm font-medium hover:bg-blue-500/15 transition-colors">
                    <BarChart2 className="w-4 h-4" /> Download Report
                  </button>
                </Link>
                <Link href="/invest/profile">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-violet-500/30 text-violet-600 bg-violet-500/8 text-sm font-medium hover:bg-violet-500/15 transition-colors">
                    <UserCog className="w-4 h-4" /> Update Investor Profile
                  </button>
                </Link>
              </div>
            </SectionCard>
          </TabsContent>
        )}

        {/* Sessions */}
        <TabsContent value="sessions" className="mt-6 space-y-6">
          <SectionCard title="Active Sessions" icon={Clock}>
            <div className="divide-y divide-border/40">
              {ACTIVE_SESSIONS.map(s => (
                <div key={s.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {s.device}
                      {s.current && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">This session</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">IP: {s.ip} · {s.location}</p>
                    <p className="text-xs text-muted-foreground">{s.lastSeen}</p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 border-red-200 text-xs"
                      onClick={() => toast({ title: "Session revoked", description: "Device signed out." })}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 text-red-500 hover:bg-red-50 border-red-200 gap-2"
              onClick={() => toast({ title: "Signed out everywhere", description: "All other sessions terminated." })}>
              <Shield className="w-4 h-4" /> Sign Out All Other Sessions
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
