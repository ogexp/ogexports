/**
 * ConfirmDialog — visual components for promise-based confirm dialogs.
 * Logic/hook lives in src/hooks/use-confirm.ts.
 *
 * Setup: wrap your app with <ConfirmDialogProvider>
 */
import { useCallback, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, Trash2, Info, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ConfirmContext,
  type ConfirmOptions,
  type ConfirmVariant,
} from "@/hooks/use-confirm"

// ─── Per-variant visual config ────────────────────────────────────────────────
const VARIANTS: Record<
  ConfirmVariant,
  {
    Icon: React.ElementType
    iconBg: string
    iconClass: string
    confirmClass: string
  }
> = {
  danger: {
    Icon: Trash2,
    iconBg: "bg-red-100 dark:bg-red-950",
    iconClass: "text-red-600 dark:text-red-400",
    confirmClass:
      "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-500/30",
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconClass: "text-amber-600 dark:text-amber-400",
    confirmClass:
      "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm shadow-amber-400/30",
  },
  info: {
    Icon: Info,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconClass: "text-blue-600 dark:text-blue-400",
    confirmClass:
      "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/30",
  },
  default: {
    Icon: HelpCircle,
    iconBg: "bg-primary/10",
    iconClass: "text-primary",
    confirmClass:
      "bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground shadow-sm shadow-primary/20",
  },
}

// ─── Provider + Dialog ────────────────────────────────────────────────────────
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setState({ ...options, open: true })
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  function handle(value: boolean) {
    setState(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }

  const v = state?.variant ?? "default"
  const cfg = VARIANTS[v]
  const { Icon } = cfg

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {state?.open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => handle(false)}
          />

          {/* Card */}
          <div
            className={cn(
              "relative z-10 w-full max-w-md",
              "bg-card border border-border rounded-2xl shadow-2xl",
              "p-6 space-y-5",
              "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-200"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto",
                cfg.iconBg
              )}
            >
              <Icon className={cn("w-8 h-8", cfg.iconClass)} />
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold leading-tight">{state.title}</h3>
              {state.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {state.description}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handle(false)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold",
                  "border border-border bg-transparent hover:bg-muted",
                  "transition-colors duration-150"
                )}
              >
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => handle(true)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm font-bold",
                  "transition-colors duration-150",
                  cfg.confirmClass
                )}
              >
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// ─── Standalone alert modal (callback-based, no promise) ─────────────────────
export interface AlertModalProps {
  open: boolean
  title: string
  description?: string
  variant?: ConfirmVariant
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function AlertModal({
  open,
  title,
  description,
  variant = "default",
  confirmLabel = "OK",
  onConfirm,
  onClose,
}: AlertModalProps) {
  if (!open) return null
  const cfg = VARIANTS[variant]
  const { Icon } = cfg

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "p-6 space-y-5",
          "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-200"
        )}
      >
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto",
            cfg.iconBg
          )}
        >
          <Icon className={cn("w-8 h-8", cfg.iconClass)} />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl text-sm font-bold",
            "transition-colors duration-150",
            cfg.confirmClass
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
