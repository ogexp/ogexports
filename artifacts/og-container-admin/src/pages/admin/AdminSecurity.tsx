import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Shield, Lock, AlertTriangle, CheckCircle2, XCircle, Monitor, Smartphone, Globe, Clock, LogOut } from "lucide-react"
import { addAuditLog, getSettings, saveSettings, type AdminSettings } from "@/lib/admin-data"
import { useAdminDashboard } from "@/hooks/useAdminDashboard"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"

const GREEN = "#4CAF50"
const EMERALD = "#0F3D2E"

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

type SecuritySession = {
  id: string
  device: string
  location: string
  ip: string
  lastActive: string
  type: "desktop" | "mobile"
  current: boolean
}

type SecurityAlert = {
  id: string
  type: string
  desc: string
  time: string
  severity: "high" | "medium" | "low"
  resolved: boolean
}

type LoginHistoryRow = {
  date: string
  ip: string
  location: string
  device: string
  status: "success" | "failed"
}

type LocalSecuritySettings = {
  twoFactor: boolean
  loginAlerts: boolean
  sessionTimeout: boolean
  ipWhitelist: boolean
  auditLogs: boolean
  ssoEnforced: boolean
  bruteForceProtection: boolean
  encryptedComms: boolean
}

const INIT_SESSIONS: SecuritySession[] = []
const LOGIN_HISTORY: LoginHistoryRow[] = []
const INIT_ALERTS: SecurityAlert[] = []

export default function AdminSecurity() {
  const { data: dashboard } = useAdminDashboard(0)
  const queryClient = useQueryClient()
  const { settings: platformSettings, refetch } = usePlatformSettings()
  const [sessions, setSessions] = useState(INIT_SESSIONS)
  const [alerts, setAlerts] = useState(INIT_ALERTS)
  const [toast, setToast] = useState("")
  const [settings, setSettings] = useState<LocalSecuritySettings>({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: true,
    ipWhitelist: false,
    auditLogs: true,
    ssoEnforced: false,
    bruteForceProtection: true,
    encryptedComms: true,
  })

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      twoFactor: platformSettings.adminOtpEnabled === true,
    }))
  }, [platformSettings.adminOtpEnabled])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const terminateSession = (id: string, device: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    addAuditLog(`Terminated session ${id} — ${device}`, "Security")
    showToast(`Session terminated: ${device}`)
  }

  const terminateAll = () => {
    setSessions(prev => prev.filter(s => s.current))
    addAuditLog("Terminated all other sessions", "Security")
    showToast("All other sessions terminated")
  }

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
    addAuditLog(`Resolved security alert ${id}`, "Security")
    showToast("Alert resolved")
  }

  const toggleSetting = (key: keyof LocalSecuritySettings) => {
    if (key === "twoFactor") {
      const next = !settings.twoFactor
      setSettings(prev => ({ ...prev, twoFactor: next }))
      const platform: AdminSettings = { ...getSettings(), ...platformSettings, adminOtpEnabled: next }
      saveSettings(platform)
      void queryClient.invalidateQueries({ queryKey: ["platform-settings"] })
      void refetch()
      addAuditLog(`Toggled Admin OTP Login: ${next ? "enabled" : "disabled"}`, "Security")
      showToast(next ? "Admin OTP Login enabled" : "Admin OTP Login disabled")
      return
    }
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    addAuditLog(`Toggled security setting: ${key}`, "Security")
    showToast(`Setting updated`)
  }

  const unresolvedAlerts = alerts.filter(a => !a.resolved).length
  const failedLogins7d = dashboard.security?.failed_attempts_7d ?? 0

  return (
    <AdminLayout title="Security Center" subtitle="Session management, login history, security policies and alerts">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active Sessions", value: String(sessions.length), icon: Monitor, color: EMERALD },
            { label: "Failed Logins (7d)", value: String(failedLogins7d || 0), icon: AlertTriangle, color: "#ef4444" },
            { label: "Security Alerts", value: String(unresolvedAlerts), icon: Shield, color: unresolvedAlerts > 0 ? "#f59e0b" : GREEN },
            { label: "2FA Status", value: settings.twoFactor ? "Enabled" : "Disabled", icon: Lock, color: settings.twoFactor ? GREEN : "#ef4444" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-lg font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Active Sessions</h3>
                <p className="text-xs text-muted-foreground">Devices currently signed in</p>
              </div>
              {sessions.filter(s => !s.current).length > 0 && (
                <button onClick={terminateAll} className="text-[11px] font-semibold text-red-500 hover:underline">Terminate all others</button>
              )}
            </div>
            <div className="divide-y divide-border">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 hover:bg-muted/20">
                  <div className="flex items-center gap-3">
                    {s.type === "mobile" ? <Smartphone className="w-4 h-4 text-muted-foreground" /> : <Monitor className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {s.device}
                        {s.current && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600">CURRENT</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <Globe className="w-3 h-3" /> {s.location} · {s.ip}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {s.lastActive}
                      </div>
                    </div>
                  </div>
                  {!s.current && (
                    <button onClick={() => terminateSession(s.id, s.device)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Terminate">
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No active sessions</div>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-sm">Security Policies</h3>
              <p className="text-xs text-muted-foreground">Platform-level security configuration</p>
            </div>
            <div className="divide-y divide-border">
              {[
                { key: "twoFactor" as const, label: "Admin OTP Login", sub: "Require email OTP after password before admin can sign in" },
                { key: "loginAlerts" as const, label: "Login Alerts", sub: "Email notification on every new login" },
                { key: "sessionTimeout" as const, label: "Session Timeout (30 min)", sub: "Auto-logout after inactivity" },
                { key: "ipWhitelist" as const, label: "IP Whitelisting", sub: "Restrict admin access to approved IPs only" },
                { key: "auditLogs" as const, label: "Comprehensive Audit Logs", sub: "Log all admin actions" },
                { key: "ssoEnforced" as const, label: "SSO Enforcement", sub: "Force single sign-on for all staff" },
                { key: "bruteForceProtection" as const, label: "Brute Force Protection", sub: "Block IP after 5 failed login attempts" },
                { key: "encryptedComms" as const, label: "Encrypted Communications", sub: "TLS 1.3 for all connections" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 hover:bg-muted/20">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                  </div>
                  <ToggleSwitch checked={settings[item.key]} onChange={() => toggleSetting(item.key)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-sm">Login History</h3>
              <p className="text-xs text-muted-foreground">Recent access attempts for admin accounts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Date", "IP", "Location", "Device", "Status"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LOGIN_HISTORY.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No login history yet</td>
                    </tr>
                  )}
                  {LOGIN_HISTORY.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{row.date}</td>
                      <td className="px-3 py-2.5 text-[11px] font-mono">{row.ip}</td>
                      <td className="px-3 py-2.5 text-[11px]">{row.location}</td>
                      <td className="px-3 py-2.5 text-[11px]">{row.device}</td>
                      <td className="px-3 py-2.5">
                        {row.status === "success"
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Success</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500"><XCircle className="w-3 h-3" /> Failed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Security Alerts</h3>
                <p className="text-xs text-muted-foreground">Unresolved threats and anomalies</p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {alerts.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">No security alerts</div>
              )}
              {alerts.map(a => (
                <div key={a.id} className={`p-4 ${a.resolved ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {a.type}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          a.severity === "high" ? "bg-red-50 text-red-600"
                            : a.severity === "medium" ? "bg-amber-50 text-amber-600"
                              : "bg-slate-100 text-slate-600"
                        }`}>{a.severity}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{a.time}</div>
                    </div>
                    {!a.resolved && (
                      <button onClick={() => resolveAlert(a.id)} className="text-[11px] font-semibold text-primary hover:underline shrink-0">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </AdminLayout>
  )
}
