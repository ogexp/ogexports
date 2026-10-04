import { useCallback, useEffect, useState } from "react"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Shield, Lock, Smartphone, Monitor, CheckCircle2, Clock,
  AlertCircle, LogOut, Eye, EyeOff, Bell, Save, FileText, Loader2,
} from "lucide-react"
import { api } from "@/lib/api"
import { useLocalAuth } from "@/lib/local-auth"

type SessionRow = {
  id: string
  ip?: string
  device: string
  last_activity_human?: string
  is_current?: boolean
}

type AuditRow = {
  id: number
  action: string
  module: string
  ip?: string
  time?: string
  meta?: Record<string, unknown> | null
}

export default function BuyerSettings() {
  const { changePassword } = useLocalAuth()
  const [activeTab, setActiveTab] = useState<"security" | "2fa" | "sessions" | "notifications" | "audit">("security")
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savedMsg, setSavedMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)

  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [twoFaPassword, setTwoFaPassword] = useState("")
  const [twoFaCode, setTwoFaCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [loadingTab, setLoadingTab] = useState(false)

  const [notifs, setNotifs] = useState({
    rfqResponse: true,
    orderUpdates: true,
    shipment: true,
    payment: true,
    marketing: false,
    weeklyReport: true,
  })

  const flash = (msg: string) => {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(""), 3000)
  }

  const load2fa = useCallback(async () => {
    try {
      const res = await api.get<{ data: { enabled: boolean } }>("/api/me/2fa")
      setTwoFAEnabled(!!res?.data?.enabled)
    } catch { /* ignore */ }
  }, [])

  const loadSessions = useCallback(async () => {
    setLoadingTab(true)
    try {
      const res = await api.get<{ data: SessionRow[] }>("/api/me/sessions")
      setSessions(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setSessions([])
    } finally {
      setLoadingTab(false)
    }
  }, [])

  const loadAudit = useCallback(async () => {
    setLoadingTab(true)
    try {
      const res = await api.get<{ data: AuditRow[] }>("/api/me/audit-logs")
      setAuditLogs(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setAuditLogs([])
    } finally {
      setLoadingTab(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "2fa") load2fa()
    if (activeTab === "sessions") loadSessions()
    if (activeTab === "audit") loadAudit()
  }, [activeTab, load2fa, loadSessions, loadAudit])

  async function handlePasswordUpdate() {
    setErrorMsg("")
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.")
      return
    }
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.")
      return
    }
    setSaving(true)
    const res = await changePassword(currentPassword, newPassword)
    setSaving(false)
    if (res.success) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      flash("Password updated successfully.")
    } else {
      setErrorMsg(res.error || "Could not update password.")
    }
  }

  async function requestEnable2fa() {
    setErrorMsg("")
    setSaving(true)
    try {
      await api.post("/api/me/2fa/enable", { password: twoFaPassword })
      setCodeSent(true)
      flash("Verification code sent to your email.")
    } catch (e: any) {
      setErrorMsg(e?.errors?.password?.[0] || e?.message || "Failed to send code.")
    } finally {
      setSaving(false)
    }
  }

  async function confirmEnable2fa() {
    setErrorMsg("")
    setSaving(true)
    try {
      await api.post("/api/me/2fa/confirm", { code: twoFaCode })
      setTwoFAEnabled(true)
      setShow2FASetup(false)
      setCodeSent(false)
      setTwoFaPassword("")
      setTwoFaCode("")
      flash("Two-factor authentication enabled.")
    } catch (e: any) {
      setErrorMsg(e?.errors?.code?.[0] || e?.message || "Invalid code.")
    } finally {
      setSaving(false)
    }
  }

  async function disable2fa() {
    const password = window.prompt("Enter your password to disable 2FA")
    if (!password) return
    setSaving(true)
    setErrorMsg("")
    try {
      await api.post("/api/me/2fa/disable", { password })
      setTwoFAEnabled(false)
      flash("Two-factor authentication disabled.")
    } catch (e: any) {
      setErrorMsg(e?.errors?.password?.[0] || e?.message || "Could not disable 2FA.")
    } finally {
      setSaving(false)
    }
  }

  async function revokeSession(id: string) {
    try {
      await api.delete(`/api/me/sessions/${id}`)
      flash("Session revoked.")
      await loadSessions()
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not revoke session.")
    }
  }

  async function revokeOthers() {
    try {
      await api.delete("/api/me/sessions/others")
      flash("Other sessions revoked.")
      await loadSessions()
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not revoke sessions.")
    }
  }

  return (
    <BuyerPortalLayout title="Security & Settings" subtitle="Password, two-factor authentication, active sessions and audit logs">
      <div className="space-y-6">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
          {[
            { key: "security", label: "Password" },
            { key: "2fa", label: "2FA" },
            { key: "sessions", label: "Sessions" },
            { key: "notifications", label: "Notifications" },
            { key: "audit", label: "Audit Log" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >{tab.label}</button>
          ))}
        </div>

        {savedMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {savedMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {activeTab === "security" && (
          <Card className="glass-card max-w-xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Current Password</Label>
                <div className="relative">
                  <Input type={showOldPass ? "text" : "password"} className="h-10 pr-10" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowOldPass(v => !v)}>
                    {showOldPass ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">New Password</Label>
                <div className="relative">
                  <Input type={showNewPass ? "text" : "password"} className="h-10 pr-10" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNewPass(v => !v)}>
                    {showNewPass ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
                <Input type="password" className="h-10" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <div className="p-3 rounded-xl bg-muted/30 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Password Requirements</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Minimum 8 characters
                </p>
              </div>
              <Button onClick={handlePasswordUpdate} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                Update Password
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "2fa" && (
          <Card className="glass-card max-w-xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-accent" /> Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${twoFAEnabled ? "bg-emerald-500/15" : "bg-muted"}`}>
                    <Shield className={`w-5 h-5 ${twoFAEnabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Email verification codes</p>
                    <p className="text-xs text-muted-foreground">{twoFAEnabled ? "Enabled — codes sent to your email" : "Not configured"}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={twoFAEnabled ? "outline" : "default"}
                  onClick={() => {
                    if (twoFAEnabled) disable2fa()
                    else { setShow2FASetup(true); setCodeSent(false) }
                  }}
                >
                  {twoFAEnabled ? "Disable" : "Enable"}
                </Button>
              </div>

              {show2FASetup && !twoFAEnabled && (
                <div className="space-y-4 p-4 rounded-xl border border-accent/20 bg-accent/5">
                  <p className="text-sm font-semibold">Enable email 2FA</p>
                  <p className="text-xs text-muted-foreground">Confirm your password first. A 6-digit code will be emailed to you.</p>
                  {!codeSent ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Current Password</Label>
                        <Input type="password" value={twoFaPassword} onChange={e => setTwoFaPassword(e.target.value)} />
                      </div>
                      <Button size="sm" onClick={requestEnable2fa} disabled={saving || !twoFaPassword}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Send Code to Email
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">6-Digit Verification Code</Label>
                        <Input
                          placeholder="000000"
                          className="h-10 text-center tracking-widest font-mono text-lg"
                          maxLength={6}
                          value={twoFaCode}
                          onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </div>
                      <Button size="sm" onClick={confirmEnable2fa} disabled={saving || twoFaCode.length !== 6}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Verify & Enable 2FA
                      </Button>
                    </>
                  )}
                </div>
              )}

              {twoFAEnabled && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Two-factor authentication is active. You will need an email code on each login.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{sessions.length} session{sessions.length === 1 ? "" : "s"}</p>
              <Button size="sm" variant="outline" className="text-red-400 hover:text-red-500" onClick={revokeOthers}>
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Revoke All Other Sessions
              </Button>
            </div>
            {loadingTab && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            {!loadingTab && sessions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No sessions found in the database. Ensure SESSION_DRIVER=database.</p>
            )}
            {sessions.map(s => (
              <Card key={s.id} className={`glass-card ${s.is_current ? "border-emerald-500/20" : ""}`}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{s.device}</p>
                      {s.is_current && <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Current</Badge>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{s.ip || "—"}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.last_activity_human || "—"}</span>
                    </div>
                  </div>
                  {!s.is_current && (
                    <Button size="sm" variant="outline" className="text-xs text-red-400 hover:text-red-500 shrink-0" onClick={() => revokeSession(s.id)}>
                      <LogOut className="w-3.5 h-3.5 mr-1" /> Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "notifications" && (
          <Card className="glass-card max-w-xl">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "rfqResponse", label: "RFQ Responses", desc: "When a quotation is received for your RFQs" },
                { key: "orderUpdates", label: "Order Status Updates", desc: "Order confirmations, production and dispatch" },
                { key: "shipment", label: "Shipment Tracking", desc: "Departure, ETA updates and delivery confirmation" },
                { key: "payment", label: "Payment Confirmations", desc: "Payment receipts and pending payment reminders" },
                { key: "weeklyReport", label: "Weekly Summary Report", desc: "Weekly summary of all trade activity" },
                { key: "marketing", label: "Product Announcements", desc: "New products, seasons and promotions" },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof notifs] }))}
                    className={`relative rounded-full transition-colors shrink-0 ${notifs[n.key as keyof typeof notifs] ? "bg-primary" : "bg-muted"}`}
                    style={{ height: "22px", width: "40px" }}
                  >
                    <span
                      className="absolute bg-white rounded-full shadow-sm transition-all"
                      style={{ left: notifs[n.key as keyof typeof notifs] ? "18px" : "2px", width: "18px", height: "18px", top: "2px" }}
                    />
                  </button>
                </div>
              ))}
              <Button className="mt-2" onClick={() => flash("Notification preferences saved locally.")}>
                <Save className="w-3.5 h-3.5 mr-2" /> Save Preferences
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === "audit" && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" /> Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTab && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
              {!loadingTab && auditLogs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No audit events yet.</p>
              )}
              <div className="divide-y divide-border">
                {auditLogs.map(l => (
                  <div key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{l.action}</p>
                      <p className="text-xs text-muted-foreground">{l.module}{l.ip ? ` · ${l.ip}` : ""}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground shrink-0">{l.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BuyerPortalLayout>
  )
}
