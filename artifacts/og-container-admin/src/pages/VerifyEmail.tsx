import { useState, useEffect, useRef } from "react"
import { useLocation, Link } from "wouter"
import { ShieldCheck, RefreshCw, AlertCircle, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout"
import { DevOtpBanner } from "@/components/auth/DevOtpBanner"
import { useLocalAuth } from "@/lib/local-auth"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import { investorHomePath } from "@/lib/investor-home"

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

export default function VerifyEmail() {
  const [, setLocation] = useLocation()
  const { verifyEmail, resendVerification } = useLocalAuth()
  const { supplierModuleEnabled, investmentModuleEnabled } = usePlatformSettings()

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  const initialEmail = params.get("email") || ""
  const initialDevOtp = params.get("dev_otp") || null

  const [email] = useState(initialEmail)
  const [devOtp, setDevOtp] = useState<string | null>(initialDevOtp)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 150)
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    setError("")
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every(d => d !== "") && digit) handleVerify(next.join(""))
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text.length) return
    const next = Array(6).fill("").map((_, i) => text[i] ?? "")
    setOtp(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
    if (text.length === 6) handleVerify(text)
  }

  function fillOtp(code: string) {
    const digits = code.replace(/\D/g, "").slice(0, 6)
    const next = Array(6).fill("").map((_, i) => digits[i] ?? "")
    setOtp(next)
    setError("")
    if (digits.length === 6) handleVerify(digits)
    else inputRefs.current[digits.length]?.focus()
  }

  async function handleVerify(code?: string) {
    if (!email) {
      setError("Missing email. Please register again.")
      return
    }
    const finalCode = code ?? otp.join("")
    if (finalCode.length !== 6) {
      setError("Please enter all 6 digits.")
      return
    }
    setVerifying(true)
    setError("")
    const res = await verifyEmail(email, finalCode)
    setVerifying(false)
    if (res.success) {
      const accountType = res.accountType
      if (accountType === "supplier" && !supplierModuleEnabled) {
        setError("The Supplier module is currently unavailable.")
        return
      }
      if (accountType === "investor" && !investmentModuleEnabled) {
        setError("The Investment module is currently unavailable.")
        return
      }
      await redirectFor(accountType, setLocation, supplierModuleEnabled, investmentModuleEnabled)
    } else {
      setError(res.error ?? "Invalid code. Please try again.")
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }

  async function handleResend() {
    if (!email) return
    setResending(true)
    setError("")
    const res = await resendVerification(email)
    setResending(false)
    if (res.success) {
      setResendCooldown(60)
      if (res.devOtp) setDevOtp(res.devOtp)
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } else {
      setError(res.error ?? "Failed to resend code.")
    }
  }

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2")

  return (
    <AuthSplitLayout>
      <div className="space-y-7">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign Up
        </Link>

        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(var(--accent) / 0.12)", border: "1px solid hsl(var(--accent) / 0.25)" }}
          >
            <ShieldCheck className="w-8 h-8" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">Verify your email</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {email ? (
                <>
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-foreground">{maskedEmail}</span>
                </>
              ) : (
                "Enter the verification code from your email."
              )}
            </p>
          </div>
        </div>

        <DevOtpBanner code={devOtp} onFill={fillOtp} />

        <div>
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={verifying}
                className="w-12 h-14 rounded-xl text-center text-xl font-bold tracking-wider transition-all duration-200 disabled:opacity-50 focus:outline-none"
                style={{
                  background: digit ? "hsl(var(--accent) / 0.08)" : "hsl(var(--muted))",
                  border: digit ? "2px solid hsl(var(--accent))" : "2px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  boxShadow: digit ? "0 0 0 3px hsl(var(--accent) / 0.15)" : "none",
                }}
              />
            ))}
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-500 justify-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <button
          onClick={() => handleVerify()}
          disabled={verifying || otp.some(d => !d) || !email}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)",
          }}
        >
          {verifying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
          ) : (
            <><ShieldCheck className="w-4 h-4" /> Activate Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="flex items-center justify-center">
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending || !email}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/sign-in" className="font-semibold text-accent hover:text-accent/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  )
}
