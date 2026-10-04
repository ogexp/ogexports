import { useState, useRef } from "react"
import { notify } from "@/lib/notify"
import { useLocation, Link } from "wouter"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  User, Mail, Phone, Shield, LogOut, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, Edit3, X, Globe,
  ShoppingCart, Truck, TrendingUp, Lock, Package, Eye, EyeOff, Camera,
  LayoutDashboard,
} from "lucide-react"
import { useLocalAuth, AccountType } from "@/lib/local-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { cn } from "@/lib/utils"

const AVATAR_KEY = "og-user-avatar"

function getAvatarForUser(userId: string): string | null {
  try { return localStorage.getItem(`${AVATAR_KEY}-${userId}`) } catch { return null }
}
function saveAvatarForUser(userId: string, dataUrl: string) {
  try { localStorage.setItem(`${AVATAR_KEY}-${userId}`, dataUrl) } catch { /* storage full */ }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().optional(),
})
type ProfileValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type PasswordValues = z.infer<typeof passwordSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACCOUNT_TYPE_LABELS: Record<AccountType, { label: string; Icon: React.ElementType; color: string }> = {
  buyer: { label: "Agricultural Buyer", Icon: ShoppingCart, color: "hsl(var(--primary))" },
  supplier: { label: "Supplier Partner", Icon: Truck, color: "#3b82f6" },
  investor: { label: "Commodity Investor", Icon: TrendingUp, color: "#22c55e" },
  admin: { label: "Platform Admin", Icon: Shield, color: "#ef4444" },
}

const DASHBOARD_BY_ROLE: Record<AccountType, { label: string; href: string }> = {
  buyer: { label: "Buyer Dashboard", href: "/buyer/dashboard" },
  supplier: { label: "Supplier Dashboard", href: "/supplier/dashboard" },
  investor: { label: "Investor Dashboard", href: "/invest/dashboard" },
  admin: { label: "Admin Dashboard", href: "/admin/dashboard" },
}

type Tab = "profile" | "security"

function tabFromPath(pathname: string): Tab {
  const segment = pathname.split("/").pop() || ""
  return segment === "security" ? "security" : "profile"
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

// ─── Avatar Upload Hook ───────────────────────────────────────────────────────
function useAvatarUpload(userId: string) {
  const [avatar, setAvatar] = useState<string | null>(() => getAvatarForUser(userId))
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function trigger() { fileRef.current?.click() }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { notify.error("File too large", "Image must be under 5 MB."); return }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      // Resize to max 256×256 using canvas
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX = 256
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL("image/jpeg", 0.82)
        saveAvatarForUser(userId, compressed)
        setAvatar(compressed)
        setUploading(false)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  function remove() {
    try { localStorage.removeItem(`${AVATAR_KEY}-${userId}`) } catch { /* ignore */ }
    setAvatar(null)
  }

  return { avatar, uploading, trigger, handleFile, remove, fileRef }
}

function InputRow({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string
  icon: React.ElementType
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />{label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LocalAccount() {
  const [pathname, setLocation] = useLocation()
  const { user, logout, updateProfile, changePassword } = useLocalAuth()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const tab = tabFromPath(pathname)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const avatarCtx = useAvatarUpload(user?.id ?? "guest")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      phone: user?.phone ?? "",
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  })

  if (!user) return null

  const typeInfo = ACCOUNT_TYPE_LABELS[user.accountType] ?? ACCOUNT_TYPE_LABELS.buyer
  const dashboard = user.accountType === "supplier" && !supplierModuleEnabled
    ? { label: "Home", href: "/" }
    : user.accountType === "investor" && !investmentModuleEnabled
    ? { label: "Home", href: "/" }
    : (DASHBOARD_BY_ROLE[user.accountType] ?? DASHBOARD_BY_ROLE.buyer)

  function setTab(next: Tab) {
    setLocation(next === "security" ? "/account/security" : "/account/profile")
  }

  async function onSaveProfile(values: ProfileValues) {
    updateProfile(values)
    profileForm.reset(values)
    setEditingProfile(false)
    setProfileSuccess(true)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  async function onChangePassword(values: PasswordValues) {
    setPasswordError("")
    const res = await changePassword(values.currentPassword, values.newPassword)
    if (res.success) {
      passwordForm.reset()
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } else {
      setPasswordError(res.error ?? "Failed to change password.")
    }
  }

  function handleLogout() {
    logout()
    setLocation("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-16 max-w-4xl">

        {/* ── Profile header ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            {/* Avatar with upload */}
            <div className="relative flex-shrink-0 group">
              {avatarCtx.avatar ? (
                <img
                  src={avatarCtx.avatar}
                  alt={user.fullName}
                  className="w-16 h-16 rounded-xl object-cover"
                  style={{ border: "2px solid hsl(var(--accent) / 0.4)" }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-heading font-bold"
                  style={{ background: "hsl(var(--accent) / 0.15)", border: "2px solid hsl(var(--accent) / 0.4)", color: "hsl(var(--accent))" }}
                >
                  {getInitials(user.fullName)}
                </div>
              )}
              {/* Camera overlay */}
              <button
                onClick={avatarCtx.trigger}
                disabled={avatarCtx.uploading}
                className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                style={{ background: "rgba(0,0,0,0.55)" }}
                title="Upload profile photo"
              >
                {avatarCtx.uploading
                  ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                  : <Camera className="w-5 h-5 text-white" />}
              </button>
              <input
                ref={avatarCtx.fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={avatarCtx.handleFile}
              />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">{user.fullName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <typeInfo.Icon className="w-3.5 h-3.5" style={{ color: typeInfo.color }} />
                <span className="text-sm text-muted-foreground">{typeInfo.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Account Type", value: typeInfo.label, Icon: typeInfo.Icon },
            { label: "Member Since", value: formatDate(user.createdAt), Icon: User },
            { label: "Account ID", value: user.id.replace("local-", "#"), Icon: Shield },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-1.5 mb-2">
                <s.Icon className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</span>
              </div>
              <div className="text-sm font-semibold text-foreground truncate">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Quick links ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          {[
            { label: dashboard.label, href: dashboard.href, Icon: LayoutDashboard },
            { label: "Browse Products", href: "/products", Icon: Package },
            { label: "Contact OG Exports", href: "/contact", Icon: Globe },
          ].map(l => (
            <Link key={l.href} href={l.href}>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-all duration-200 cursor-pointer group">
                <div className="flex items-center gap-3">
                  <l.Icon className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">{l.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl bg-card border border-border mb-8 w-fit">
          {(["profile", "security"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 capitalize",
                tab === t
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "profile" ? "Profile" : "Security"}
            </button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {tab === "profile" && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-bold text-foreground">Profile Information</h2>
                <p className="text-sm text-muted-foreground">Manage your personal details.</p>
              </div>
              {!editingProfile ? (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-accent hover:border-accent/50 transition-all duration-200"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <button
                  onClick={() => { setEditingProfile(false); profileForm.reset() }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-red-400 hover:border-red-400/50 transition-all duration-200"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Avatar upload section in profile tab */}
            <div className="flex items-center gap-5 p-4 rounded-xl border border-border bg-muted/20">
              <div className="relative group flex-shrink-0">
                {avatarCtx.avatar ? (
                  <img src={avatarCtx.avatar} alt={user.fullName} className="w-16 h-16 rounded-xl object-cover" style={{ border: "2px solid hsl(var(--accent) / 0.4)" }} />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-heading font-bold" style={{ background: "hsl(var(--accent) / 0.15)", border: "2px solid hsl(var(--accent) / 0.4)", color: "hsl(var(--accent))" }}>
                    {getInitials(user.fullName)}
                  </div>
                )}
                <button onClick={avatarCtx.trigger} disabled={avatarCtx.uploading} className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer" style={{ background: "rgba(0,0,0,0.5)" }}>
                  {avatarCtx.uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                </button>
                <input ref={avatarCtx.fileRef} type="file" accept="image/*" className="hidden" onChange={avatarCtx.handleFile} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Profile Photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hover over the image and click to upload. JPG/PNG, max 5 MB.</p>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={avatarCtx.trigger} disabled={avatarCtx.uploading} className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all" style={{ background: "hsl(var(--accent) / 0.12)", color: "hsl(var(--accent))" }}>
                    <Camera className="w-3 h-3 inline mr-1" />{avatarCtx.uploading ? "Uploading…" : "Upload Photo"}
                  </button>
                  {avatarCtx.avatar && (
                    <button onClick={avatarCtx.remove} className="px-3 py-1.5 text-xs font-semibold rounded-lg text-red-400 transition-all hover:bg-red-400/10">
                      <X className="w-3 h-3 inline mr-1" />Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {profileSuccess && (
              <div className="flex items-center gap-2 p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 text-sm text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Profile updated successfully.
              </div>
            )}

            {editingProfile ? (
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-5">
                <InputRow label="Full Name" icon={User} error={profileForm.formState.errors.fullName?.message}>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                    {...profileForm.register("fullName")}
                  />
                </InputRow>

                <InputRow label="Phone / WhatsApp" icon={Phone} error={profileForm.formState.errors.phone?.message}>
                  <input
                    type="tel"
                    placeholder="+92 300 0000000"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                    {...profileForm.register("phone")}
                  />
                </InputRow>

                <InputRow label="Account Type" icon={Shield}>
                  <div className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm bg-muted/40 border border-border text-muted-foreground">
                    <typeInfo.Icon className="w-4 h-4 shrink-0" style={{ color: typeInfo.color }} />
                    {typeInfo.label}
                  </div>
                </InputRow>

                <button
                  type="submit"
                  disabled={profileForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-60"
                  style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
                >
                  {profileForm.formState.isSubmitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-0">
                {[
                  { label: "Full Name", value: user.fullName, Icon: User },
                  { label: "Email Address", value: user.email, Icon: Mail },
                  { label: "Phone / WhatsApp", value: user.phone || "—", Icon: Phone },
                  { label: "Account Type", value: typeInfo.label, Icon: typeInfo.Icon },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
                    <f.Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">{f.label}</div>
                      <div className="text-sm font-medium text-foreground">{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === "security" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-heading font-bold text-foreground">Change Password</h2>
                <p className="text-sm text-muted-foreground">Update your password to keep your account secure.</p>
              </div>
              <div className="h-px bg-border" />

              {passwordError && (
                <div className="flex items-center gap-2 p-3.5 rounded-lg border border-red-500/30 bg-red-500/8 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/8 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Password updated successfully.
                </div>
              )}

              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-5">
                <InputRow label="Current Password" icon={Lock} error={passwordForm.formState.errors.currentPassword?.message}>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full pr-10 px-3.5 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      {...passwordForm.register("currentPassword")}
                    />
                    <button type="button" onClick={() => setShowCurrentPw(p => !p)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </InputRow>

                <InputRow label="New Password" icon={Lock} error={passwordForm.formState.errors.newPassword?.message}>
                  <div className="relative">
                    <input
                      type={showNewPw ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      className="w-full pr-10 px-3.5 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                      {...passwordForm.register("newPassword")}
                    />
                    <button type="button" onClick={() => setShowNewPw(p => !p)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </InputRow>

                <InputRow label="Confirm New Password" icon={Lock} error={passwordForm.formState.errors.confirmPassword?.message}>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    {...passwordForm.register("confirmPassword")}
                  />
                </InputRow>

                <button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-60"
                  style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
                >
                  {passwordForm.formState.isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Update Password</>}
                </button>
              </form>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-heading font-bold text-foreground mb-1">Sign Out</h2>
              <p className="text-sm text-muted-foreground mb-5">Sign out of your current session on this device.</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
