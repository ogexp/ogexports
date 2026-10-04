import { useCallback, useEffect, useMemo, useState } from "react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Bell, Shield, Smartphone, Globe, Moon,
  Sun, LogOut, Trash2, CheckCircle2, Monitor,
  Lock, Key, Eye, EyeOff, AlertTriangle, Loader2, AlertCircle, Clock,
} from "lucide-react"
import { useLocalAuth } from "@/lib/local-auth"
import { api } from "@/lib/api"
import { notify } from "@/lib/notify"

const TABS = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "preferences", label: "Preferences", icon: Globe },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "login-history", label: "Login History", icon: Monitor },
]

const DEFAULT_NOTIFS = {
  depositApproved: true,
  withdrawalCompleted: true,
  profitCredit: true,
  documentRequired: true,
  kycUpdate: true,
  adminAnnounce: false,
  marketUpdates: false,
  email: true,
  sms: false,
  inApp: true,
}

const DEFAULT_PREFS = {
  language: "English",
  currency: "USD",
  theme: "dark",
  dateFormat: "MM/DD/YYYY",
  numberFormat: "1,000,000.00 (US)",
}

const LOGIN_ACTIONS = /^login\./

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
  created_at?: string
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex items-center ${checked ? "bg-primary" : "bg-border"}`}
      style={{ height: "22px" }}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all absolute ${checked ? "left-5.5" : "left-0.5"}`} style={{ left: checked ? "calc(100% - 18px)" : "2px" }} />
    </button>
  )
}

function loginStatus(action: string): "success" | "blocked" {
  if (action === "login.failed" || action === "login.blocked") return "blocked"
  return "success"
}

function auditDevice(row: AuditRow): string {
  const meta = row.meta
  if (meta && typeof meta.device === "string" && meta.device) return meta.device
  if (meta && typeof meta.user_agent === "string" && meta.user_agent) {
    return meta.user_agent.length > 60 ? `${meta.user_agent.slice(0, 60)}…` : meta.user_agent
  }
  return row.action.replace(/^login\./, "").replace(/_/g, " ")
}

function auditLocation(row: AuditRow): string {
  const meta = row.meta
  if (meta && typeof meta.location === "string" && meta.location) return meta.location
  return "—"
}

export default function InvestSettings() {
  const { changePassword, refreshUser } = useLocalAuth()
  const [tab, setTab] = useState("notifications")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showPass, setShowPass] = useState(false)
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)

  const [txPasswordSet, setTxPasswordSet] = useState(false)
  const [txForm, setTxForm] = useState({ login: "", tx: "", confirm: "" })
  const [txSaving, setTxSaving] = useState(false)

  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [twoFaPassword, setTwoFaPassword] = useState("")
  const [twoFaCode, setTwoFaCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [securitySaving, setSecuritySaving] = useState(false)

  const [accountStatus, setAccountStatus] = useState<"active" | "suspended">("active")
  const [accountSaving, setAccountSaving] = useState(false)

  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS)
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [loadingTab, setLoadingTab] = useState(false)

  const loginHistory = useMemo(
    () => auditLogs.filter(l => LOGIN_ACTIONS.test(l.action)),
    [auditLogs],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await api.get("/api/investor/profile")
        const d = res?.data ?? res
        if (cancelled) return
        if (d?.notification_prefs && typeof d.notification_prefs === "object") {
          setNotifs({ ...DEFAULT_NOTIFS, ...d.notification_prefs })
        }
        if (d?.preferences && typeof d.preferences === "object") {
          setPrefs({ ...DEFAULT_PREFS, ...d.preferences })
        }
        const status = d?.account_status || d?.user?.accountStatus || "active"
        setAccountStatus(status === "suspended" ? "suspended" : "active")
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const load2fa = useCallback(async () => {
    try {
      const res = await api.get<{ data: { enabled: boolean } }>("/api/me/2fa")
      setTwoFAEnabled(!!res?.data?.enabled)
    } catch { /* ignore */ }
  }, [])

  const loadTxPassword = useCallback(async () => {
    try {
      const res = await api.get<{ data: { set: boolean } }>("/api/investor/security/transaction-password")
      setTxPasswordSet(!!res?.data?.set)
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
    if (tab === "security") {
      load2fa()
      loadTxPassword()
    }
    if (tab === "devices") loadSessions()
    if (tab === "login-history") loadAudit()
  }, [tab, load2fa, loadTxPassword, loadSessions, loadAudit])

  function toggle(key: keyof typeof notifs) {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function updatePrefs<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    setPrefs(p => ({ ...p, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.put("/api/investor/profile", {
        notification_prefs: notifs,
        preferences: prefs,
      })
      setSaved(true)
      notify.success("Preferences saved")
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      notify.error(e?.message || "Unable to save preferences")
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordUpdate() {
    setErrorMsg("")
    if (pwForm.next !== pwForm.confirm) {
      setErrorMsg("Passwords do not match.")
      notify.error("Passwords do not match")
      return
    }
    if (pwForm.next.length < 8) {
      setErrorMsg("Password must be at least 8 characters.")
      notify.error("Password must be at least 8 characters")
      return
    }
    setPwSaving(true)
    const res = await changePassword(pwForm.current, pwForm.next)
    setPwSaving(false)
    if (res.success) {
      setPwForm({ current: "", next: "", confirm: "" })
      notify.success("Password updated")
    } else {
      setErrorMsg(res.error || "Unable to update password")
      notify.error(res.error || "Unable to update password")
    }
  }

  async function handleTxPasswordSave() {
    setErrorMsg("")
    if (txForm.tx !== txForm.confirm) {
      setErrorMsg("Transaction passwords do not match.")
      notify.error("Transaction passwords do not match")
      return
    }
    if (txForm.tx.length < 6) {
      setErrorMsg("Transaction password must be at least 6 characters.")
      notify.error("Transaction password must be at least 6 characters")
      return
    }
    setTxSaving(true)
    try {
      const endpoint = txPasswordSet
        ? "/api/investor/security/transaction-password/reset"
        : "/api/investor/security/transaction-password/set"
      await api.post(endpoint, {
        password: txForm.login,
        transaction_password: txForm.tx,
        transaction_password_confirmation: txForm.confirm,
      })
      setTxPasswordSet(true)
      setTxForm({ login: "", tx: "", confirm: "" })
      notify.success(txPasswordSet ? "Transaction password updated" : "Transaction password set")
    } catch (e: any) {
      const msg = e?.errors?.password?.[0] || e?.message || "Unable to save transaction password."
      setErrorMsg(msg)
      notify.error(msg)
    } finally {
      setTxSaving(false)
    }
  }

  async function requestEnable2fa() {
    setErrorMsg("")
    setSecuritySaving(true)
    try {
      await api.post("/api/me/2fa/enable", { password: twoFaPassword })
      setCodeSent(true)
      notify.success("Verification code sent to your email")
    } catch (e: any) {
      setErrorMsg(e?.errors?.password?.[0] || e?.message || "Failed to send code.")
    } finally {
      setSecuritySaving(false)
    }
  }

  async function confirmEnable2fa() {
    setErrorMsg("")
    setSecuritySaving(true)
    try {
      await api.post("/api/me/2fa/confirm", { code: twoFaCode })
      setTwoFAEnabled(true)
      setShow2FASetup(false)
      setCodeSent(false)
      setTwoFaPassword("")
      setTwoFaCode("")
      notify.success("Two-factor authentication enabled")
    } catch (e: any) {
      setErrorMsg(e?.errors?.code?.[0] || e?.message || "Invalid code.")
    } finally {
      setSecuritySaving(false)
    }
  }

  async function disable2fa() {
    const password = window.prompt("Enter your password to disable 2FA")
    if (!password) return
    setSecuritySaving(true)
    setErrorMsg("")
    try {
      await api.post("/api/me/2fa/disable", { password })
      setTwoFAEnabled(false)
      notify.success("Two-factor authentication disabled")
    } catch (e: any) {
      setErrorMsg(e?.errors?.password?.[0] || e?.message || "Could not disable 2FA.")
    } finally {
      setSecuritySaving(false)
    }
  }

  async function revokeSession(id: string) {
    try {
      await api.delete(`/api/me/sessions/${id}`)
      notify.success("Session revoked")
      await loadSessions()
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not revoke session.")
      notify.error(e?.message || "Could not revoke session")
    }
  }

  async function revokeOthers() {
    try {
      await api.delete("/api/me/sessions/others")
      notify.success("Other sessions revoked")
      await loadSessions()
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not revoke sessions.")
      notify.error(e?.message || "Could not revoke sessions")
    }
  }

  async function handleDeactivate() {
    const next = accountStatus === "active" ? "suspended" : "active"
    setAccountSaving(true)
    try {
      await api.put("/api/investor/profile", { account_status: next })
      setAccountStatus(next)
      await refreshUser()
      notify.success(next === "active" ? "Account activated" : "Account deactivated")
    } catch (e: any) {
      notify.error(e?.message || "Unable to update account")
    } finally {
      setAccountSaving(false)
    }
  }

  if (loading) {
    return (
      <InvestPortalLayout title="Account Settings" subtitle="Manage your preferences and security">
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading settings…
        </div>
      </InvestPortalLayout>
    )
  }

  return (
    <InvestPortalLayout title="Account Settings" subtitle="Manage your preferences and security">
      <div className="space-y-6">

        <div className="flex gap-1 overflow-x-auto bg-muted/40 p-1 rounded-xl">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setErrorMsg("") }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-5">
            <Card className="glass-card">
              <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Event Notifications</div>
                {[
                  { key: "depositApproved" as const, label: "Deposit Approved", desc: "When your deposit is reviewed and credited" },
                  { key: "withdrawalCompleted" as const, label: "Withdrawal Completed", desc: "When your withdrawal is processed and transferred" },
                  { key: "profitCredit" as const, label: "Profit Credit", desc: "When monthly or trade profits are distributed" },
                  { key: "documentRequired" as const, label: "Document Required", desc: "When additional KYC documents are requested" },
                  { key: "kycUpdate" as const, label: "KYC Status Update", desc: "When your KYC verification status changes" },
                  { key: "adminAnnounce" as const, label: "Admin Announcements", desc: "Platform news and maintenance notices" },
                  { key: "marketUpdates" as const, label: "Market Updates", desc: "New investment opportunities and commodity insights" },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{n.label}</div>
                      <div className="text-xs text-muted-foreground">{n.desc}</div>
                    </div>
                    <Toggle checked={notifs[n.key]} onChange={() => toggle(n.key)} />
                  </div>
                ))}

                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-2">Delivery Channels</div>
                {[
                  { key: "email" as const, label: "Email Notifications", icon: Bell },
                  { key: "sms" as const, label: "SMS Notifications", icon: Smartphone },
                  { key: "inApp" as const, label: "In-App Notifications", icon: Bell },
                ].map(c => (
                  <div key={c.key} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div className="flex items-center gap-2">
                      <c.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{c.label}</span>
                    </div>
                    <Toggle checked={notifs[c.key]} onChange={() => toggle(c.key)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : saved ? <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Saved!</> : "Save Preferences"}
            </Button>
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-5">
            <Card className="glass-card">
              <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/8 border border-primary/15 gap-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-sm">Two-Factor Authentication (2FA)</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Email verification codes for extra login security</div>
                      {twoFAEnabled && <Badge className="mt-2 bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Enabled</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={twoFAEnabled ? "outline" : "default"}
                    disabled={securitySaving}
                    onClick={() => {
                      if (twoFAEnabled) void disable2fa()
                      else { setShow2FASetup(true); setCodeSent(false) }
                    }}
                  >
                    {twoFAEnabled ? "Disable" : "Enable"}
                  </Button>
                </div>

                {show2FASetup && !twoFAEnabled && (
                  <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <p className="text-sm font-semibold">Enable email 2FA</p>
                    <p className="text-xs text-muted-foreground">Confirm your password first. A 6-digit code will be emailed to you.</p>
                    {!codeSent ? (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Current Password</Label>
                          <Input type="password" value={twoFaPassword} onChange={e => setTwoFaPassword(e.target.value)} />
                        </div>
                        <Button size="sm" onClick={() => void requestEnable2fa()} disabled={securitySaving || !twoFaPassword}>
                          {securitySaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
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
                        <Button size="sm" onClick={() => void confirmEnable2fa()} disabled={securitySaving || twoFaCode.length !== 6}>
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

                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" /> Change Password
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showPass ? "text" : "password"}
                          placeholder="Enter current password"
                          value={pwForm.current}
                          onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={pwForm.next}
                        onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        placeholder="Re-enter new password"
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handlePasswordUpdate()} disabled={pwSaving || !pwForm.current || !pwForm.next}>
                    {pwSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Updating…</> : <><Key className="w-4 h-4 mr-1.5" /> Update Password</>}
                  </Button>
                </div>

                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" /> Transaction Password
                    {txPasswordSet && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">Set</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Required before every withdrawal. Keep it separate from your login password.</p>
                  <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Login Password</Label>
                      <Input
                        type="password"
                        placeholder="Confirm your login password"
                        value={txForm.login}
                        onChange={e => setTxForm(f => ({ ...f, login: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{txPasswordSet ? "New Transaction Password" : "Transaction Password"}</Label>
                      <Input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={txForm.tx}
                        onChange={e => setTxForm(f => ({ ...f, tx: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Transaction Password</Label>
                      <Input
                        type="password"
                        placeholder="Re-enter transaction password"
                        value={txForm.confirm}
                        onChange={e => setTxForm(f => ({ ...f, confirm: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleTxPasswordSave()}
                    disabled={txSaving || !txForm.login || !txForm.tx || !txForm.confirm}
                  >
                    {txSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : txPasswordSet ? "Update Transaction Password" : "Set Transaction Password"}
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-border gap-4">
                  <div>
                    <div className="text-sm font-medium">Auto Session Timeout</div>
                    <div className="text-xs text-muted-foreground">Automatically log out after inactivity — Coming soon</div>
                  </div>
                  <select disabled className="h-9 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground cursor-not-allowed">
                    <option>30 minutes</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="font-heading text-base text-red-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Sign Out All Devices</div>
                    <div className="text-xs text-muted-foreground">Log out from all active sessions except this one</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-400/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => void revokeOthers()}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out All
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{accountStatus === "active" ? "Deactivate Account" : "Reactivate Account"}</div>
                    <div className="text-xs text-muted-foreground">
                      {accountStatus === "active"
                        ? "Temporarily disable your investor account"
                        : "Your account is currently deactivated"}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-400/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    disabled={accountSaving}
                    onClick={() => void handleDeactivate()}
                  >
                    {accountSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : accountStatus === "active"
                        ? <><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Deactivate</>
                        : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Activate</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "preferences" && (
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={prefs.language} onChange={e => updatePrefs("language", e.target.value)}>
                    <option>English</option><option>Urdu</option><option>Arabic</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Display Currency</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={prefs.currency} onChange={e => updatePrefs("currency", e.target.value)}>
                    <option>USD</option><option>PKR</option><option>EUR</option><option>GBP</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-3">
                  {[
                    { id: "dark", icon: Moon, label: "Dark Mode" },
                    { id: "light", icon: Sun, label: "Light Mode" },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updatePrefs("theme", t.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${prefs.theme === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date Format</Label>
                <select
                  className="w-full max-w-xs h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={prefs.dateFormat}
                  onChange={e => updatePrefs("dateFormat", e.target.value)}
                >
                  <option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Number Format</Label>
                <select
                  className="w-full max-w-xs h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={prefs.numberFormat}
                  onChange={e => updatePrefs("numberFormat", e.target.value)}
                >
                  <option>1,000,000.00 (US)</option><option>1.000.000,00 (EU)</option>
                </select>
              </div>

              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : saved ? <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Saved!</> : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === "devices" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">{sessions.length} active session{sessions.length === 1 ? "" : "s"}</p>
              <Button size="sm" variant="outline" className="text-red-400 hover:text-red-500" onClick={() => void revokeOthers()}>
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Revoke All Other Sessions
              </Button>
            </div>
            {loadingTab && (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            )}
            {!loadingTab && sessions.length === 0 && (
              <Card className="glass-card">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No sessions found. Ensure SESSION_DRIVER=database.
                </CardContent>
              </Card>
            )}
            {!loadingTab && sessions.map(s => (
              <Card key={s.id} className={`glass-card ${s.is_current ? "border-primary/30" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Monitor className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{s.device}</span>
                      {s.is_current && <Badge className="text-[10px] border-0 bg-emerald-500/15 text-emerald-600">Current</Badge>}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{s.ip || "—"}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.last_activity_human || "—"}</span>
                    </div>
                  </div>
                  {!s.is_current && (
                    <Button variant="outline" size="sm" className="shrink-0 text-red-400 border-red-400/20 hover:bg-red-500/10" onClick={() => void revokeSession(s.id)}>
                      Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {tab === "login-history" && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" /> Login History
              </CardTitle>
              <p className="text-sm text-muted-foreground">Recent sign-in activity on your account</p>
            </CardHeader>
            <CardContent>
              {loadingTab && (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              )}
              {!loadingTab && loginHistory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No login events yet.</p>
              )}
              {!loadingTab && loginHistory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Date & Time", "Device", "Location", "IP Address", "Status"].map(h => (
                          <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loginHistory.map(l => {
                        const status = loginStatus(l.action)
                        return (
                          <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-3 text-muted-foreground whitespace-nowrap text-xs">{l.time || l.created_at || "—"}</td>
                            <td className="py-3 px-3 font-medium">{auditDevice(l)}</td>
                            <td className="py-3 px-3 text-muted-foreground">{auditLocation(l)}</td>
                            <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{l.ip || "—"}</td>
                            <td className="py-3 px-3">
                              <Badge
                                className={`text-[10px] border-0 ${status === "success" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"}`}
                              >
                                {status === "success" ? <><CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Successful</> : <><AlertTriangle className="w-2.5 h-2.5 mr-1" /> Blocked</>}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </InvestPortalLayout>
  )
}
