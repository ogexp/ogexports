import { useEffect, useState } from "react"
import { useLocation, Link } from "wouter"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle,
  ArrowRight, Loader2, ShoppingCart, Package, TrendingUp, CheckCircle2,
  Globe, ChevronsUpDown, Check
} from "lucide-react"
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout"
import { useLocalAuth, AccountType } from "@/lib/local-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { investorHomePath } from "@/lib/investor-home"
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from "@/components/ui/command"

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  country: z.string().min(1, "Select your country"),
  accountType: z.enum(["buyer", "investor", "supplier"] as const, {
    required_error: "Select an account type",
  }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms to continue" }) }),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})
type FormValues = z.infer<typeof schema>

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"]
const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"]

// ─── Account type cards ───────────────────────────────────────────────────────
const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string; Icon: React.ElementType }[] = [
  {
    value: "buyer",
    label: "Buyer",
    desc: "Import agricultural commodities for manufacturing, retail, or distribution.",
    Icon: ShoppingCart,
  },
  {
    value: "supplier",
    label: "Supplier",
    desc: "Submit product offers and supply agricultural commodities to OG Exports.",
    Icon: Package,
  },
  {
    value: "investor",
    label: "Investor",
    desc: "Fund export shipments and earn profit-sharing returns on agricultural trade.",
    Icon: TrendingUp,
  },
]

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-foreground/50">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SignUp() {
  const [, setLocation] = useLocation()
  const { register: registerUser } = useLocalAuth()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneNum, setPhoneNum] = useState("")

  const availableAccountTypes = ACCOUNT_TYPES.filter(
    t => (supplierModuleEnabled || t.value !== "supplier")
      && (investmentModuleEnabled || t.value !== "investor"),
  )

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const password = watch("password", "")
  const strength = getStrength(password)
  const selectedAccountType = watch("accountType")

  useEffect(() => {
    if (selectedAccountType === "supplier" && !supplierModuleEnabled) {
      setValue("accountType", undefined as unknown as FormValues["accountType"])
    }
    if (selectedAccountType === "investor" && !investmentModuleEnabled) {
      setValue("accountType", undefined as unknown as FormValues["accountType"])
    }
  }, [selectedAccountType, supplierModuleEnabled, investmentModuleEnabled, setValue])

  async function onSubmit(values: FormValues) {
    setServerError("")
    if (values.accountType === "supplier" && !supplierModuleEnabled) {
      setServerError("The Supplier module is currently unavailable.")
      return
    }
    if (values.accountType === "investor" && !investmentModuleEnabled) {
      setServerError("The Investment module is currently unavailable.")
      return
    }
    const res = await registerUser({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      country: values.country,
      password: values.password,
      accountType: values.accountType,
    })
    if (res.success) {
      if (res.requiresVerification && res.email) {
        const qs = new URLSearchParams({ email: res.email })
        if (res.devOtp) qs.set("dev_otp", res.devOtp)
        setLocation(`/verify-email?${qs.toString()}`)
        return
      }
      if (values.accountType === "buyer") {
        setLocation("/buyer/dashboard")
      } else if (values.accountType === "supplier") {
        setLocation("/supplier/dashboard")
      } else {
        setLocation(await investorHomePath(investmentModuleEnabled))
      }
    } else {
      setServerError(res.error ?? "Registration failed. Please try again.")
    }
  }

  return (
    <AuthSplitLayout>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG Exports" className="h-14 w-auto mb-6" />
          <h2 className="text-3xl font-heading font-bold text-foreground">Create your account</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Join buyers and investors on OG Exports
          </p>
        </div>

        <div className="h-px w-12" style={{ background: "hsl(var(--accent))" }} />

        {/* Server error */}
        {serverError && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/8 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Account type */}
          <Field label="Account Type" error={errors.accountType?.message}>
            <Controller
              control={control}
              name="accountType"
              render={({ field }) => (
                <div className={cn("grid gap-2.5", availableAccountTypes.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                  {availableAccountTypes.map(t => {
                    const selected = field.value === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => field.onChange(t.value)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-3.5 rounded-lg border text-center transition-all duration-200",
                          selected
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-accent/40 hover:text-foreground"
                        )}
                      >
                        <t.Icon className={cn("w-5 h-5", selected ? "text-accent" : "text-muted-foreground")} />
                        <span className="text-xs font-semibold">{t.label}</span>
                        {selected && (
                          <CheckCircle2
                            className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-accent"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {/* Selected type description */}
            {watch("accountType") && (
              <p className="text-xs text-muted-foreground mt-1.5 px-0.5">
                {ACCOUNT_TYPES.find(t => t.value === watch("accountType"))?.desc}
              </p>
            )}
          </Field>

          {/* Full name */}
          <Field label="Full Name" error={errors.fullName?.message}>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                autoComplete="name"
                placeholder="Ahmed Khan"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                {...register("fullName")}
              />
            </div>
          </Field>

          {/* Email */}
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

          {/* Country — placed before phone so code auto-fills */}
          <Field label="Country" error={errors.country?.message}>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className={cn(
                        "w-full flex items-center gap-2.5 pl-3.5 pr-3 py-3 rounded-lg text-sm border bg-background transition-all duration-200 text-left",
                        countryOpen
                          ? "border-accent ring-2 ring-accent/20"
                          : "border-border hover:border-foreground/30",
                        !field.value && "text-muted-foreground/50"
                      )}
                    >
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">
                        {field.value
                          ? `${field.value}${COUNTRY_CODES[field.value] ? "  " + COUNTRY_CODES[field.value] : ""}`
                          : "Select your country"}
                      </span>
                      <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[var(--radix-popover-trigger-width)]"
                    align="start"
                    sideOffset={6}
                  >
                    <Command>
                      <CommandInput placeholder="Search country…" className="h-9 text-sm" />
                      <CommandList className="max-h-56">
                        <CommandEmpty className="py-4 text-sm text-muted-foreground text-center">
                          No country found.
                        </CommandEmpty>
                        <CommandGroup>
                          {COUNTRIES.map(c => (
                            <CommandItem
                              key={c}
                              value={c}
                              onSelect={() => {
                                // Use canonical country label — cmdk lowercases `val`
                                field.onChange(c)
                                setCountryOpen(false)
                                // Auto-fill phone country code
                                const code = COUNTRY_CODES[c] ?? ""
                                setPhoneCode(code)
                                setPhoneNum("")
                                setValue("phone", code ? code + " " : "", { shouldDirty: true })
                              }}
                              className="flex items-center gap-2 cursor-pointer text-sm"
                            >
                              <Check
                                className={cn(
                                  "w-3.5 h-3.5 shrink-0 text-primary",
                                  field.value === c ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1">{c}</span>
                              {COUNTRY_CODES[c] && (
                                <span className="text-xs text-muted-foreground font-mono">{COUNTRY_CODES[c]}</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </Field>

          {/* Phone — code pre-fills from country selection */}
          <Field label="Phone / WhatsApp (optional)" error={errors.phone?.message}>
            <input type="hidden" {...register("phone")} />
            <div className="flex rounded-lg border border-border overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all duration-200">
              <div className="flex items-center gap-1.5 px-3 py-3 bg-muted/50 border-r border-border shrink-0 min-w-[5rem] justify-center">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-mono text-foreground/70 tracking-tight">
                  {phoneCode || "+--"}
                </span>
              </div>
              <input
                type="tel"
                autoComplete="tel"
                placeholder={phoneCode ? "300 0000000" : "Select country first"}
                value={phoneNum}
                onChange={e => {
                  setPhoneNum(e.target.value)
                  setValue("phone", phoneCode ? phoneCode + " " + e.target.value : e.target.value, { shouldDirty: true })
                }}
                className="flex-1 px-3 py-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          </Field>

          {/* Password */}
          <Field label="Password" error={errors.password?.message}>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
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
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        background: i <= strength ? strengthColor[strength] : "hsl(var(--border))",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strengthColor[strength] }}>
                  {strengthLabel[strength]}
                </p>
              </div>
            )}
          </Field>

          {/* Confirm password */}
          <Field label="Confirm Password" error={errors.confirmPassword?.message}>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                className="w-full pl-10 pr-11 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {/* Terms */}
          <Field label="" error={errors.terms?.message}>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-accent cursor-pointer mt-0.5 flex-shrink-0"
                {...register("terms")}
              />
              <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                I agree to the{" "}
                <Link href="/terms" className="text-accent hover:underline font-medium" target="_blank">
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-accent hover:underline font-medium" target="_blank">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </Field>

          {/* Submit */}
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
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
            ) : (
              <>Create Account <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-accent hover:text-accent/80 transition-colors">
            Sign in
          </Link>
        </p>

        <p className="text-center">
          <Link href="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            ← Back to OG Exports
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  )
}
