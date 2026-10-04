import { useEffect, useState } from "react"
import { useLocation, Link } from "wouter"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight, Loader2, Shield } from "lucide-react"
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout"
import { TwoFactorModal } from "@/components/auth/TwoFactorModal"
import { useLocalAuth } from "@/lib/local-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-foreground/50">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function dashboardForRole(role?: string, supplierModuleEnabled = true, investmentModuleEnabled = true) {
  if (role === "admin") return "/admin/dashboard"
  if (role === "buyer") return "/buyer/dashboard"
  if (role === "supplier") return supplierModuleEnabled ? "/supplier/dashboard" : "/"
  if (role === "investor") return investmentModuleEnabled ? "/invest/dashboard" : "/"
  return "/"
}

export default function AdminLogin() {
  const [, setLocation] = useLocation()
  const { login, refreshUser, isLoaded, isSignedIn, user } = useLocalAuth()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState("")
  const [twoFaToken, setTwoFaToken] = useState<string | null>(null)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [remember, setRemember] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { remember: false },
  })

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || twoFaToken) return
    setLocation(dashboardForRole(user.accountType, supplierModuleEnabled, investmentModuleEnabled))
  }, [isLoaded, isSignedIn, user, setLocation, supplierModuleEnabled, investmentModuleEnabled, twoFaToken])

  async function onSubmit(values: FormValues) {
    setServerError("")
    setRemember(!!values.remember)
    setLoginEmail(values.email)
    const res = await login(values.email, values.password, values.remember)

    if (res.requires2fa && res.twoFactorToken) {
      setTwoFaToken(res.twoFactorToken)
      setMaskedEmail(res.maskedEmail || values.email)
      setDevOtp(res.devOtp ?? null)
      return
    }

    if (res.success) {
      if (res.accountType === "supplier" && !supplierModuleEnabled) {
        setServerError("The Supplier module is currently unavailable.")
        return
      }
      if (res.accountType === "investor" && !investmentModuleEnabled) {
        setServerError("The Investment module is currently unavailable.")
        return
      }
      setLocation(dashboardForRole(res.accountType, supplierModuleEnabled, investmentModuleEnabled))
    } else {
      setServerError(res.error ?? "Sign-in failed. Please try again.")
    }
  }

  async function handleOtpVerified(accountType?: string) {
    await refreshUser()
    setTwoFaToken(null)
    setDevOtp(null)
    setLocation(dashboardForRole(accountType || "admin", supplierModuleEnabled, investmentModuleEnabled))
  }

  if (!isLoaded || (isSignedIn && user && !twoFaToken)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground text-sm">
        {isSignedIn ? "Redirecting…" : "Loading…"}
      </div>
    )
  }

  return (
    <AuthSplitLayout>
      {twoFaToken && (
        <TwoFactorModal
          email={loginEmail}
          maskedEmail={maskedEmail}
          twoFactorToken={twoFaToken}
          remember={remember}
          devOtp={devOtp}
          onVerified={handleOtpVerified}
          onCancel={() => { setTwoFaToken(null); setDevOtp(null); setServerError("") }}
        />
      )}

      <div className="space-y-8">
        <div>
          <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG Exports" className="h-14 w-auto mb-6" />
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-3"
            style={{ background: "rgba(212,160,18,0.12)", color: "#D4A012" }}>
            <Shield className="w-3 h-3" />
            Super Admin
          </div>
          <h2 className="text-3xl font-heading font-bold text-foreground">Admin Portal Sign In</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to the OG Exports admin control panel
          </p>
        </div>

        <div className="h-px w-12" style={{ background: "hsl(var(--accent))" }} />

        {serverError && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/8 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Field label="Admin Email" error={errors.email?.message}>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                autoComplete="email"
                placeholder="ogadmin@ogexports.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                {...register("email")}
              />
            </div>
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                {...register("remember")}
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Remember me
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: "hsl(var(--accent))",
              color: "hsl(var(--accent-foreground))",
              boxShadow: "0 2px 16px hsl(var(--accent) / 0.35)",
            }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
            ) : (
              <>Sign In to Admin <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center">
          <Link href="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            ← Go Back to Home Page
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  )
}
