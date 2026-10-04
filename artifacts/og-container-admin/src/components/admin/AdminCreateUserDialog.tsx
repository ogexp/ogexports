import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { AlertCircle, Check, ChevronsUpDown, Eye, EyeOff, Globe, Loader2, Lock, Mail, Phone, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { COUNTRIES, COUNTRY_CODES } from "@/lib/countries"
import { ApiError } from "@/lib/api"
import { createAdminUserAsync } from "@/lib/admin-data"
import { cn } from "@/lib/utils"

export type AdminCreateRole = "buyer" | "investor" | "supplier"

const ROLE_META: Record<AdminCreateRole, { label: string; desc: string }> = {
  buyer: {
    label: "Buyer",
    desc: "Import agricultural commodities for manufacturing, retail, or distribution.",
  },
  supplier: {
    label: "Supplier",
    desc: "Submit product offers and supply agricultural commodities to OG Exports.",
  },
  investor: {
    label: "Investor",
    desc: "Fund export shipments and earn profit-sharing returns on agricultural trade.",
  },
}

const EMERALD = "#0F3D2E"

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-foreground/50">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

export function AdminCreateUserDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: AdminCreateRole
  onSuccess: (message: string) => void
}) {
  const meta = ROLE_META[role]
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [countryOpen, setCountryOpen] = useState(false)
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneNum, setPhoneNum] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setFullName("")
    setEmail("")
    setCountry("")
    setPhoneCode("")
    setPhoneNum("")
    setPassword("")
    setConfirmPassword("")
    setErrors({})
    setServerError("")
    setSaving(false)
  }, [open, role])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (fullName.trim().length < 2) next.fullName = "Enter a full name"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address"
    if (!country) next.country = "Select a country"
    if (password.length < 8) next.password = "Password must be at least 8 characters"
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match"
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    setServerError("")
    try {
      const phone = phoneCode ? `${phoneCode} ${phoneNum}`.trim() : phoneNum.trim()
      await createAdminUserAsync({
        name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone || undefined,
        role,
        country,
      })
      onOpenChange(false)
      onSuccess(`${meta.label} ${fullName.trim()} created`)
    } catch (err) {
      const apiErr = err as ApiError
      const first = apiErr.errors ? Object.values(apiErr.errors)[0]?.[0] : undefined
      setServerError(first || apiErr.message || "Could not create user.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {meta.label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">User role</div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{meta.label}</div>
            <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
          </div>

          {serverError && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <Field label="Full Name" error={errors.fullName}>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ahmed Khan"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-primary"
              />
            </div>
          </Field>

          <Field label="Email Address" error={errors.email}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-primary"
              />
            </div>
          </Field>

          <Field label="Country" error={errors.country}>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border bg-background text-left",
                    !country && "text-muted-foreground",
                  )}
                >
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">
                    {country
                      ? `${country}${COUNTRY_CODES[country] ? "  " + COUNTRY_CODES[country] : ""}`
                      : "Select country"}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <Command>
                  <CommandInput placeholder="Search country…" className="h-9 text-sm" />
                  <CommandList className="max-h-56">
                    <CommandEmpty className="py-4 text-sm text-muted-foreground text-center">No country found.</CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES.map(c => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={() => {
                            setCountry(c)
                            setCountryOpen(false)
                            const code = COUNTRY_CODES[c] ?? ""
                            setPhoneCode(code)
                            setPhoneNum("")
                          }}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Check className={cn("w-3.5 h-3.5 shrink-0", country === c ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{c}</span>
                          {COUNTRY_CODES[c] && <span className="text-xs text-muted-foreground font-mono">{COUNTRY_CODES[c]}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="Phone / WhatsApp (optional)">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted/50 border-r border-border shrink-0 min-w-[5rem] justify-center">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-mono text-foreground/70">{phoneCode || "+--"}</span>
              </div>
              <input
                type="tel"
                placeholder={phoneCode ? "300 0000000" : "Select country first"}
                value={phoneNum}
                onChange={e => setPhoneNum(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm bg-background focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Password" error={errors.password}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-primary"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm Password" error={errors.confirmPassword}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-primary"
              />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-70"
            style={{ background: EMERALD }}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : `Create ${meta.label}`}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
