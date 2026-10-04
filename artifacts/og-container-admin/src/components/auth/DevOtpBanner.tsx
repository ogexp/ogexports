import { FlaskConical } from "lucide-react"

const DEV_FALLBACK = "888777"

export function resolveDevOtp(code?: string | null): string | null {
  if (code) return code
  if (import.meta.env.DEV) return DEV_FALLBACK
  return null
}

interface DevOtpBannerProps {
  code?: string | null
  onFill?: (code: string) => void
}

export function DevOtpBanner({ code, onFill }: DevOtpBannerProps) {
  const displayCode = resolveDevOtp(code)
  if (!displayCode) return null

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-lg text-sm"
      style={{
        background: "hsl(43 78% 52% / 0.12)",
        border: "1px solid hsl(43 78% 52% / 0.35)",
        color: "hsl(var(--foreground))",
      }}
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--accent))" }} />
        <div>
          <p className="font-semibold">Development mode</p>
          <p className="text-muted-foreground mt-0.5">
            Your OTP:{" "}
            <span className="font-mono font-bold tracking-widest text-foreground">{displayCode}</span>
          </p>
        </div>
      </div>
      {onFill && (
        <button
          type="button"
          onClick={() => onFill(displayCode)}
          className="shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "hsl(var(--accent))",
            color: "hsl(var(--accent-foreground))",
          }}
        >
          Fill code
        </button>
      )}
    </div>
  )
}
