import { useState, useRef, useEffect } from "react"
import { Link } from "wouter"
import {
  Mail, AlertCircle, ArrowRight, Loader2,
  CheckCircle2, ArrowLeft, ShieldCheck, RefreshCw,
  Eye, EyeOff, Lock,
} from "lucide-react"
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout"
import { DevOtpBanner } from "@/components/auth/DevOtpBanner"
import { useLocalAuth } from "@/lib/local-auth"

type Step = "email" | "otp" | "newPassword" | "done"

export default function ForgotPassword() {
  const { forgotPasswordSendOtp, verifyResetOtp, resetPassword } = useLocalAuth()
  const [step, setStep] = useState<Step>("email")

  const [email, setEmail] = useState("")
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [emailError, setEmailError] = useState("")
  const [submittingEmail, setSubmittingEmail] = useState(false)

  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpError, setOtpError] = useState("")
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState("")
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address.")
      return
    }
    setEmailError("")
    setSubmittingEmail(true)
    const res = await forgotPasswordSendOtp(email.trim().toLowerCase())
    setSubmittingEmail(false)
    if (!res.success) {
      setEmailError(res.error ?? "Failed to send code. Please try again.")
      return
    }
    if (res.devOtp) setDevOtp(res.devOtp)
    setResendCooldown(60)
    setStep("otp")
    setTimeout(() => inputRefs.current[0]?.focus(), 150)
  }

  async function handleResend() {
    setResending(true)
    setOtpError("")
    const res = await forgotPasswordSendOtp(email)
    setResending(false)
    if (res.success) {
      if (res.devOtp) setDevOtp(res.devOtp)
      setResendCooldown(60)
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } else {
      setOtpError(res.error ?? "Failed to resend code.")
    }
  }

  function handleOtpChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    setOtpError("")
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every(d => d !== "") && digit) handleVerifyOtp(next.join(""))
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus()
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text.length) return
    const next = Array(6).fill("").map((_, i) => text[i] ?? "")
    setOtp(next)
    inputRefs.current[Math.min(text.length, 5)]?.focus()
    if (text.length === 6) handleVerifyOtp(text)
  }

  function fillOtp(code: string) {
    const digits = code.replace(/\D/g, "").slice(0, 6)
    const next = Array(6).fill("").map((_, i) => digits[i] ?? "")
    setOtp(next)
    setOtpError("")
    if (digits.length === 6) handleVerifyOtp(digits)
    else inputRefs.current[digits.length]?.focus()
  }

  async function handleVerifyOtp(code?: string) {
    const finalCode = code ?? otp.join("")
    if (finalCode.length !== 6) {
      setOtpError("Please enter all 6 digits.")
      return
    }
    setVerifyingOtp(true)
    setOtpError("")
    const res = await verifyResetOtp(email, finalCode)
    setVerifyingOtp(false)
    if (res.success) {
      setStep("newPassword")
    } else {
      setOtpError(res.error ?? "Incorrect code. Please try again.")
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.")
      return
    }
    setPwError("")
    setSavingPw(true)
    const result = await resetPassword(email, newPassword)
    setSavingPw(false)
    if (result.success) setStep("done")
    else setPwError(result.error ?? "Failed to reset password.")
  }

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2")

  return (
    <AuthSplitLayout>
      {step === "email" && (
        <div className="space-y-8">
          <Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>

          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Enter your email and we'll send a 6-digit verification code.
            </p>
            <div className="mt-4 w-8 h-0.5 rounded-full" style={{ background: "hsl(var(--accent))" }} />
          </div>

          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-foreground/50">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError("") }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                />
              </div>
              {emailError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3 shrink-0" />{emailError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingEmail || !email}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))", boxShadow: "0 2px 16px hsl(var(--accent) / 0.35)" }}
            >
              {submittingEmail ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending Code…</>
              ) : (
                <>Send Verification Code <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/sign-in" className="font-semibold text-accent hover:text-accent/80 transition-colors">Sign in</Link>
          </p>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-7">
          <button onClick={() => setStep("email")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Change email
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.12)", border: "1px solid hsl(var(--accent) / 0.25)" }}>
              <ShieldCheck className="w-8 h-8" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">Check your email</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                A 6-digit reset code was sent to{" "}
                <span className="font-semibold text-foreground">{maskedEmail}</span>
              </p>
            </div>
          </div>

          <DevOtpBanner code={devOtp} onFill={fillOtp} />

          <div>
            <div className="flex gap-3 justify-center" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  disabled={verifyingOtp}
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
            {otpError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-500 justify-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{otpError}
              </div>
            )}
          </div>

          <button
            onClick={() => handleVerifyOtp()}
            disabled={verifyingOtp || otp.some(d => !d)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)" }}
          >
            {verifyingOtp ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" /> Verify Code</>
            )}
          </button>

          <div className="flex items-center justify-center">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      )}

      {step === "newPassword" && (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Set new password</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Choose a strong password for <span className="font-semibold text-foreground">{maskedEmail}</span>.
            </p>
            <div className="mt-4 w-8 h-0.5 rounded-full" style={{ background: "hsl(var(--accent))" }} />
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-foreground/50">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPwError("") }}
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-widest text-foreground/50">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPwError("") }}
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-sm bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {pwError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{pwError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingPw || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", boxShadow: "0 4px 20px hsl(var(--primary) / 0.35)" }}
            >
              {savingPw ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                <>Reset Password <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.15)", border: "2px solid hsl(var(--accent) / 0.4)" }}>
              <CheckCircle2 className="w-9 h-9" style={{ color: "hsl(var(--accent))" }} />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Password Reset!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
            </div>
            <Link href="/sign-in" className="w-full">
              <button
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-200"
                style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
              >
                <ArrowRight className="w-4 h-4" /> Sign In Now
              </button>
            </Link>
          </div>
        </div>
      )}
    </AuthSplitLayout>
  )
}
