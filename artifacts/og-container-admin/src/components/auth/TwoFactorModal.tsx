import { useState, useEffect, useRef } from "react"
import { Loader2, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { DevOtpBanner } from "@/components/auth/DevOtpBanner"

interface Props {
  email: string
  maskedEmail?: string
  twoFactorToken: string
  remember?: boolean
  devOtp?: string | null
  onVerified: (accountType?: string) => void
  onCancel: () => void
}

export function TwoFactorModal({
  email,
  maskedEmail,
  twoFactorToken,
  remember = false,
  devOtp: initialDevOtp = null,
  onVerified,
  onCancel,
}: Props) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [devOtp, setDevOtp] = useState<string | null>(initialDevOtp)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setDevOtp(initialDevOtp)
  }, [initialDevOtp])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }, [])

  function fillOtp(code: string) {
    const digits = code.replace(/\D/g, "").slice(0, 6)
    const next = Array(6).fill("").map((_, i) => digits[i] ?? "")
    setOtp(next)
    setError("")
    if (digits.length === 6) handleVerify(digits)
    else inputRefs.current[digits.length]?.focus()
  }

  async function handleResend() {
    setResending(true)
    setError("")
    try {
      const res = await api.post<any>("/api/auth/2fa/resend", { token: twoFactorToken })
      if (res.dev_otp) setDevOtp(res.dev_otp)
      setResendCooldown(60)
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (e) {
      const err = e as ApiError
      setError(err.errors?.token?.[0] || err.message || "Failed to resend code.")
    } finally {
      setResending(false)
    }
  }

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

  async function handleVerify(code?: string) {
    const finalCode = code ?? otp.join("")
    if (finalCode.length !== 6) {
      setError("Please enter all 6 digits.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await api.post<any>("/api/auth/2fa/verify", {
        token: twoFactorToken,
        code: finalCode,
        remember,
      })
      onVerified(res.user?.accountType || res.user?.account_type)
    } catch (e) {
      const err = e as ApiError
      setError(err.errors?.code?.[0] || err.message || "Invalid code. Please try again.")
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const displayEmail = maskedEmail || email.replace(/(.{2}).+(@.+)/, "$1***$2")

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "hsl(0 0% 0% / 0.70)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 space-y-7 relative"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 32px 80px hsl(0 0% 0% / 0.35)",
        }}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "hsl(var(--accent) / 0.12)", border: "1px solid hsl(var(--accent) / 0.25)" }}
          >
            <ShieldCheck className="w-8 h-8" style={{ color: "hsl(var(--accent))" }} />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">Two-Step Verification</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              A 6-digit code was sent to{" "}
              <span className="font-semibold text-foreground">{displayEmail}</span>
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
                disabled={loading || resending}
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
          disabled={loading || resending || otp.some(d => !d)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)",
          }}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
          ) : (
            <><ShieldCheck className="w-4 h-4" /> Verify & Sign In</>
          )}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            Use different account
          </button>
        </div>
      </div>
    </div>
  )
}
