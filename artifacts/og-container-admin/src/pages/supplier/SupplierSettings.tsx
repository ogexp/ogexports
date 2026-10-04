import { useEffect, useState } from "react"
import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Bell, Lock, CheckCircle2, Eye, EyeOff, Save, Power, Loader2 } from "lucide-react"
import { useLocalAuth } from "@/lib/local-auth"
import { api } from "@/lib/api"
import { notify } from "@/lib/notify"

const DEFAULT_NOTIFS = {
  offerStatus: true,
  messages: true,
  newsletter: false,
  reminders: true,
}

export default function SupplierSettings() {
  const { changePassword, refreshUser } = useLocalAuth()
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState("")
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [accountStatus, setAccountStatus] = useState<"active" | "suspended">("active")
  const [accountSaving, setAccountSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res: any = await api.get("/api/supplier/profile")
        const d = res?.data ?? res
        if (cancelled) return
        if (d?.notification_prefs) {
          setNotifs({ ...DEFAULT_NOTIFS, ...d.notification_prefs })
        }
        const status = d?.user?.accountStatus || d?.user?.account_status || "active"
        setAccountStatus(status === "suspended" ? "suspended" : "active")
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  function toggleShow(k: keyof typeof show) { setShow(s => ({ ...s, [k]: !s[k] })) }
  function toggleNotif(k: keyof typeof notifs) {
    setNotifs(n => ({ ...n, [k]: !n[k] }))
    setNotifSaved(false)
  }

  async function savePassword() {
    setPwError("")
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Passwords do not match")
      return
    }
    if (pwForm.next.length < 8) {
      setPwError("Password must be at least 8 characters")
      return
    }
    setPwSaving(true)
    const res = await changePassword(pwForm.current, pwForm.next)
    setPwSaving(false)
    if (res.success) {
      setPwSaved(true)
      setPwForm({ current: "", next: "", confirm: "" })
      notify.success("Password updated")
      setTimeout(() => setPwSaved(false), 3000)
    } else {
      setPwError(res.error || "Unable to update password")
      notify.error(res.error || "Unable to update password")
    }
  }

  async function saveNotifs() {
    setNotifSaving(true)
    try {
      await api.put("/api/supplier/profile", { notification_prefs: notifs })
      setNotifSaved(true)
      notify.success("Preferences saved")
      setTimeout(() => setNotifSaved(false), 3000)
    } catch (e: any) {
      notify.error(e?.message || "Unable to save preferences")
    } finally {
      setNotifSaving(false)
    }
  }

  async function toggleAccount() {
    const next = accountStatus === "active" ? "suspended" : "active"
    setAccountSaving(true)
    try {
      await api.put("/api/supplier/profile", { account_status: next })
      setAccountStatus(next)
      await refreshUser()
      notify.success(next === "active" ? "Account activated" : "Account deactivated")
    } catch (e: any) {
      notify.error(e?.message || "Unable to update account status")
    } finally {
      setAccountSaving(false)
    }
  }

  if (loading) {
    return (
      <SupplierPortalLayout title="Settings" subtitle="Manage your account security and notification preferences">
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading settings…
        </div>
      </SupplierPortalLayout>
    )
  }

  return (
    <SupplierPortalLayout title="Settings" subtitle="Manage your account security and notification preferences">
      <div className="max-w-2xl mx-auto space-y-6">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["current", "next", "confirm"] as const).map((k) => (
              <div key={k}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block capitalize">
                  {k === "current" ? "Current Password" : k === "next" ? "New Password" : "Confirm New Password"}
                </label>
                <div className="relative">
                  <input
                    type={show[k] ? "text" : "password"}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    value={pwForm[k]}
                    onChange={e => { setPwForm(f => ({ ...f, [k]: e.target.value })); setPwSaved(false); setPwError("") }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => toggleShow(k)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
            <div className="flex justify-end">
              <Button onClick={() => void savePassword()} disabled={pwSaving || !pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm}>
                {pwSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
                  : pwSaved ? <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Password Updated</>
                  : <><Save className="w-4 h-4 mr-2" /> Update Password</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "offerStatus" as const, label: "Offer Status Updates",   desc: "Approved, rejected, hold notifications for your offers" },
              { key: "messages"   as const, label: "New Messages",            desc: "When OG Exports team sends you a message" },
              { key: "reminders"  as const, label: "Document Reminders",      desc: "Reminders to upload missing verification documents" },
              { key: "newsletter" as const, label: "Market Newsletter",       desc: "Weekly commodity price updates and trade news" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => toggleNotif(key)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${notifs[key] ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifs[key] ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => void saveNotifs()} disabled={notifSaving}>
                {notifSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  : notifSaved ? <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Saved</>
                  : <><Save className="w-4 h-4 mr-2" /> Save Preferences</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Power className="w-4 h-4 text-primary" /> Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl border bg-muted/20">
              <div>
                <p className="text-sm font-medium">
                  {accountStatus === "active" ? "Account Active" : "Account Disabled"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {accountStatus === "active"
                    ? "Your supplier account is active and can submit offers."
                    : "Your account is deactivated. Reactivate to resume trading."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={accountSaving}
                onClick={() => void toggleAccount()}
                className={accountStatus === "active" ? "border-red-400/40 text-red-500" : "border-emerald-400/40 text-emerald-600"}
              >
                {accountSaving ? <Loader2 className="w-4 h-4 animate-spin" />
                  : accountStatus === "active" ? "Disable" : "Activate"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </SupplierPortalLayout>
  )
}
