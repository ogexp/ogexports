import { useState } from "react"
import { useLocation, Link } from "wouter"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout"
import { TwoFactorModal } from "@/components/auth/TwoFactorModal"
import { useLocalAuth } from "@/lib/local-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { investorHomePath } from "@/lib/investor-home"

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

async function redirectFor(
  accountType: string | undefined,
  setLocation: (p: string) => void,
  supplierModuleEnabled: boolean,
  investmentModuleEnabled: boolean,
) {
  if (accountType === "admin") setLocation("/admin/dashboard")
  else if (accountType === "buyer") setLocation("/buyer/dashboard")
  else if (accountType === "supplier") {
    setLocation(supplierModuleEnabled ? "/supplier/dashboard" : "/")
  } else {
    setLocation(await investorHomePath(investmentModuleEnabled))
  }
}

export default function SignIn() {
  const [, setLocation] = useLocation()
  const { login, refreshUser } = useLocalAuth()
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

  async function onSubmit(values: FormValues) {
    setServerError("")
    setRemember(!!values.remember)
    setLoginEmail(values.email)
    const res = await login(values.email, values.password, values.remember)

    if (res.requiresVerification) {
      const qs = new URLSearchParams({ email: res.email || values.email })
      if (res.devOtp) qs.set("dev_otp", res.devOtp)
      setLocation(`/verify-email?${qs.toString()}`)
      return
    }

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
      await redirectFor(res.accountType, setLocation, supplierModuleEnabled, investmentModuleEnabled)
    } else {
      setServerError(res.error ?? "Sign-in failed. Please try again.")
    }
  }

  async function handleOtpVerified(accountType?: string) {
    await refreshUser()
    if (accountType === "supplier" && !supplierModuleEnabled) {
      setServerError("The Supplier module is currently unavailable.")
      setTwoFaToken(null)
      return
    }
    if (accountType === "investor" && !investmentModuleEnabled) {
      setServerError("The Investment module is currently unavailable.")
      setTwoFaToken(null)
      return
    }
    await redirectFor(accountType, setLocation, supplierModuleEnabled, investmentModuleEnabled)
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
          <h2 className="text-2xl font-heading font-semibold text-foreground">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your OG Exports trade account
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
          <Field label="Email Address" error={errors.email?.message}>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
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
              <input type="checkbox" className="w-4 h-4 rounded border-border accent-accent cursor-pointer" {...register("remember")} />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-accent hover:text-accent/80 font-medium transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: "0 2px 8px hsl(var(--primary) / 0.16)",
            }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/sign-up" className="font-semibold text-accent hover:text-accent/80 transition-colors">
            Register
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  )
}
