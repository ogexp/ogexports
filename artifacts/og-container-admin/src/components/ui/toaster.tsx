import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Bell,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// ─── Per-variant visual config ────────────────────────────────────────────────
const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    border: "border-l-emerald-500",
    progress: "bg-emerald-500",
  },
  error: {
    Icon: XCircle,
    iconClass: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-950",
    border: "border-l-red-500",
    progress: "bg-red-500",
  },
  destructive: {
    Icon: XCircle,
    iconClass: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-950",
    border: "border-l-red-500",
    progress: "bg-red-500",
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950",
    border: "border-l-amber-500",
    progress: "bg-amber-500",
  },
  info: {
    Icon: Info,
    iconClass: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950",
    border: "border-l-blue-500",
    progress: "bg-blue-500",
  },
  loading: {
    Icon: Loader2,
    iconClass: "text-primary animate-spin",
    iconBg: "bg-primary/10",
    border: "border-l-primary",
    progress: "bg-primary",
  },
  default: {
    Icon: Bell,
    iconClass: "text-foreground/60",
    iconBg: "bg-muted",
    border: "border-l-border",
    progress: "bg-foreground/30",
  },
} as const

type VariantKey = keyof typeof VARIANTS

const DURATION = 4800 // ms before auto-dismiss

// ─── Single toast item ────────────────────────────────────────────────────────
function ToastItem({
  id,
  title,
  description,
  variant,
  onDismiss,
}: {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: string
  onDismiss: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const [barWidth, setBarWidth] = useState(100)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const key = (variant as VariantKey) in VARIANTS ? (variant as VariantKey) : "default"
  const cfg = VARIANTS[key]
  const { Icon } = cfg

  function dismiss() {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
    setVisible(false)
    setTimeout(() => onDismiss(id), 320)
  }

  useEffect(() => {
    // Entrance — tiny delay so CSS picks up the transition
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })

    // Progress bar
    const start = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setBarWidth(pct)
    }, 50)

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, DURATION)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Layout
        "relative flex items-start gap-3 w-full",
        "pl-4 pr-10 py-3.5",
        // Visual
        "bg-card text-card-foreground",
        "border border-l-4 rounded-xl shadow-xl",
        cfg.border,
        // Motion
        "transition-all duration-300 ease-out will-change-transform",
        visible
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-6 opacity-0 scale-[0.98]"
      )}
    >
      {/* Icon bubble */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          cfg.iconBg
        )}
      >
        <Icon className={cn("w-4 h-4", cfg.iconClass)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        {title && (
          <p className="text-[13px] font-semibold leading-snug text-foreground">
            {title}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        aria-label="Close notification"
        className={cn(
          "absolute top-2.5 right-2.5",
          "p-1 rounded-md",
          "text-muted-foreground hover:text-foreground hover:bg-muted/70",
          "transition-colors duration-150"
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full", cfg.progress)}
          style={{
            width: `${barWidth}%`,
            transition: "width 50ms linear",
          }}
        />
      </div>
    </div>
  )
}

// ─── Toaster container ────────────────────────────────────────────────────────
export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      aria-label="Notifications"
      className={cn(
        "fixed bottom-5 right-5 z-[100]",
        "flex flex-col gap-2.5",
        "w-[390px] max-w-[calc(100vw-2.5rem)]"
      )}
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          onDismiss={dismiss}
        />
      ))}
    </div>,
    document.body
  )
}
